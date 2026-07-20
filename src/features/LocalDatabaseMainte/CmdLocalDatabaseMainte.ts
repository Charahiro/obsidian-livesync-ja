import { sizeToHumanReadable } from "octagonal-wheels/number";
import {
    EntryTypes,
    LOG_LEVEL_INFO,
    LOG_LEVEL_NOTICE,
    LOG_LEVEL_VERBOSE,
    type DocumentID,
    type EntryDoc,
    type EntryLeaf,
    type FilePathWithPrefix,
    type MetaEntry,
} from "@lib/common/types";
import { getNoFromRev } from "@lib/pouchdb/LiveSyncLocalDB";
import { LiveSyncCommands } from "@/features/LiveSyncCommands";
import { serialized } from "octagonal-wheels/concurrency/lock_v2";
import { arrayToChunkedArray } from "octagonal-wheels/collection";
import { EVENT_ANALYSE_DB_USAGE, EVENT_REQUEST_PERFORM_GC_V3, eventHub } from "@/common/events";
import type { LiveSyncCouchDBReplicator } from "@lib/replication/couchdb/LiveSyncReplicator";
import { delay } from "@lib/common/utils";
import { isNotFoundError } from "@lib/common/utils.doc";
// import { _requestToCouchDB } from "@/common/utils";
const DB_KEY_SEQ = "gc-seq";
const DB_KEY_CHUNK_SET = "chunk-set";
const DB_KEY_DOC_USAGE_MAP = "doc-usage-map";
type ChunkID = DocumentID;
type NoteDocumentID = DocumentID;
type Rev = string;

type ChunkUsageMap = Map<NoteDocumentID, Map<Rev, Set<ChunkID>>>;
export class LocalDatabaseMaintenance extends LiveSyncCommands {
    onunload(): void {
        // NO OP.
    }
    onload(): void | Promise<void> {
        // NO OP.
        this.plugin.addCommand({
            id: "analyse-database",
            name: "Analyse Database Usage (advanced)",
            icon: "database-search",
            callback: async () => {
                await this.analyseDatabase();
            },
        });
        this.plugin.addCommand({
            id: "gc-v3",
            name: "Garbage Collection V3 (advanced, beta)",
            icon: "trash-2",
            callback: async () => {
                await this.gcv3();
            },
        });
        eventHub.onEvent(EVENT_ANALYSE_DB_USAGE, () => this.analyseDatabase());
        eventHub.onEvent(EVENT_REQUEST_PERFORM_GC_V3, () => this.gcv3());
    }
    async allChunks(includeDeleted: boolean = false) {
        const p = this._progress("", LOG_LEVEL_NOTICE);
        p.log("Retrieving chunks informations..");
        try {
            const ret = await this.localDatabase.allChunks(includeDeleted);
            return ret;
        } finally {
            p.done();
        }
    }
    get database() {
        return this.localDatabase.localDatabase;
    }
    clearHash() {
        this.localDatabase.clearCaches();
    }

    async confirm(title: string, message: string, affirmative = "はい", negative = "いいえ") {
        return (
            (await this.core.confirm.askSelectStringDialogue(message, [affirmative, negative], {
                title,
                defaultAction: affirmative,
            })) === affirmative
        );
    }
    isAvailable() {
        if (!this.settings.doNotUseFixedRevisionForChunks) {
            this._notice(
                "ガベージコレクションを使用するには、設定で「チャンクのリビジョンを計算」を有効にしてください。"
            );
            return false;
        }
        if (this.settings.readChunksOnline) {
            this._notice(
                "ガベージコレクションを使用するには、設定で「チャンクをオンラインで読み取る」を無効にしてください。"
            );
            return false;
        }
        return true;
    }
    /**
     * Resurrect deleted chunks that are still used in the database.
     */
    async resurrectChunks() {
        if (!this.isAvailable()) return;
        const { used, existing } = await this.allChunks(true);
        const excessiveDeletions = [...existing]
            .filter(([key, e]) => e._deleted)
            .filter(([key, e]) => used.has(e._id))
            .map(([key, e]) => e);
        const completelyLostChunks = [] as string[];
        // Data lost chunks : chunks that are deleted and data is purged.
        const dataLostChunks = [...existing]
            .filter(([key, e]) => e._deleted && e.data === "")
            .map(([key, e]) => e)
            .filter((e) => used.has(e._id));
        for (const e of dataLostChunks) {
            // Retrieve the data from the previous revision.
            const doc = await this.database.get(e._id, { rev: e._rev, revs: true, revs_info: true, conflicts: true });
            const history = doc._revs_info || [];
            // Chunks are immutable. So, we can resurrect the chunk by copying the data from any of previous revisions.
            let resurrected = null as null | string;
            const availableRevs = history
                .filter((e) => e.status == "available")
                .map((e) => e.rev)
                .sort((a, b) => getNoFromRev(a) - getNoFromRev(b));
            for (const rev of availableRevs) {
                const revDoc = await this.database.get(e._id, { rev: rev });
                if (revDoc.type == "leaf" && revDoc.data !== "") {
                    // Found the data.
                    resurrected = revDoc.data;
                    break;
                }
            }
            // If the data is not found, we cannot resurrect the chunk, add it to the excessiveDeletions.
            if (resurrected !== null) {
                excessiveDeletions.push({ ...e, data: resurrected, _deleted: false });
            } else {
                completelyLostChunks.push(e._id);
            }
        }
        // Chunks to be resurrected.
        const resurrectChunks = excessiveDeletions.filter((e) => e.data !== "").map((e) => ({ ...e, _deleted: false }));

        if (resurrectChunks.length == 0) {
            this._notice("復元できるチャンクは見つかりませんでした。");
            return;
        }
        const message = `削除済みですが、データベース内でまだ使用されているチャンクがあります。

- 完全に失われたチャンク: ${completelyLostChunks.length}
- 復元可能なチャンク: ${resurrectChunks.length}

これらのチャンクを復元しますか？`;
        if (await this.confirm("チャンクの復元", message, "復元", "キャンセル")) {
            const result = await this.database.bulkDocs(resurrectChunks);
            this.clearHash();
            const resurrectedChunks = result.filter((e) => "ok" in e).map((e) => e.id);
            this._notice(`復元したチャンク: ${resurrectedChunks.length} / ${resurrectChunks.length}`);
        } else {
            this._notice("復元操作はキャンセルされました。");
        }
    }
    /**
     * Commit deletion of files that are marked as deleted.
     * This method makes the deletion permanent, and the files will not be recovered.
     * After this, chunks that are used in the deleted files become ready for compaction.
     */
    async commitFileDeletion() {
        if (!this.isAvailable()) return;
        const p = this._progress("", LOG_LEVEL_NOTICE);
        p.log("Searching for deleted files..");
        const docs = await this.database.allDocs<MetaEntry>({ include_docs: true });
        const deletedDocs = docs.rows.filter(
            (e) => (e.doc?.type == "newnote" || e.doc?.type == "plain") && e.doc?.deleted
        );
        if (deletedDocs.length == 0) {
            p.done("削除済みファイルは見つかりませんでした。");
            return;
        }
        p.log(`${deletedDocs.length} 件の削除済みファイルが見つかりました。`);

        const message = `削除済みとしてマークされているファイルがあります。

- 削除済みファイル: ${deletedDocs.length}

これらのファイルを完全に削除してよろしいですか？

注意: **削除前に、すべてのデバイスを必ず同期してください。**

> [!Note]
> この操作はデータベースへ永続的に影響します。この操作後、削除したファイルは復元できません。
> また、削除したファイルで使用されていたチャンクはコンパクション可能になります。`;

        const deletingDocs = deletedDocs.map((e) => ({ ...e.doc, _deleted: true }) as MetaEntry);

        if (await this.confirm("ファイルの削除", message, "削除", "キャンセル")) {
            const result = await this.database.bulkDocs(deletingDocs);
            this.clearHash();
            p.done(`${result.filter((e) => "ok" in e).length} / ${deletedDocs.length} 件のファイルを削除しました。`);
        } else {
            p.done("削除操作はキャンセルされました。");
        }
    }
    /**
     * Commit deletion of chunks that are not used in the database.
     * This method makes the deletion permanent, and the chunks will not be recovered if the database run compaction.
     * After this, the database can shrink the database size by compaction.
     * It is recommended to compact the database after this operation (History should be kept once before compaction).
     */
    async commitChunkDeletion() {
        if (!this.isAvailable()) return;
        const { existing } = await this.allChunks(true);
        const deletedChunks = [...existing].filter(([key, e]) => e._deleted && e.data !== "").map(([key, e]) => e);
        const deletedNotVacantChunks = deletedChunks.map((e) => ({ ...e, data: "", _deleted: true }));
        const size = deletedChunks.reduce((acc, e) => acc + e.data.length, 0);
        const humanSize = sizeToHumanReadable(size);
        const message = `削除済みとしてマークされているチャンクがあります。

- 削除済みチャンク: ${deletedNotVacantChunks.length} (${humanSize})

これらのチャンクを完全に削除してよろしいですか？

注意: **削除前に、すべてのデバイスを必ず同期してください。**

> [!Note]
> この操作により、最終的にリモートの使用容量が削減されます。`;

        if (deletedNotVacantChunks.length == 0) {
            this._notice("削除済みチャンクは見つかりませんでした。");
            return;
        }
        if (await this.confirm("チャンクの削除", message, "削除", "キャンセル")) {
            const result = await this.database.bulkDocs(deletedNotVacantChunks);
            this.clearHash();
            this._notice(
                `削除したチャンク: ${result.filter((e) => "ok" in e).length} / ${deletedNotVacantChunks.length}`
            );
        } else {
            this._notice("削除操作はキャンセルされました。");
        }
    }
    /**
     * Compact the database.
     * This method removes all deleted chunks that are not used in the database.
     * Make sure all devices are synchronized before running this method.
     */
    async markUnusedChunks() {
        if (!this.isAvailable()) return;
        const { used, existing } = await this.allChunks();
        const existChunks = [...existing];
        const unusedChunks = existChunks.filter(([key, e]) => !used.has(e._id)).map(([key, e]) => e);
        const deleteChunks = unusedChunks.map((e) => ({
            ...e,
            _deleted: true,
        }));
        const size = deleteChunks.reduce((acc, e) => acc + e.data.length, 0);
        const humanSize = sizeToHumanReadable(size);
        if (deleteChunks.length == 0) {
            this._notice("未使用チャンクは見つかりませんでした。");
            return;
        }
        const message = `どのファイルからも使用されていないチャンクがあります。

- チャンク: ${deleteChunks.length} (${humanSize})

これらのチャンクを削除対象としてマークしてよろしいですか？

注意: **削除前に、すべてのデバイスを必ず同期してください。**

> [!Note]
> この操作だけでは、完全削除するまでリモートの使用容量は削減されません。`;

        if (await this.confirm("未使用チャンクのマーク", message, "マーク", "キャンセル")) {
            const result = await this.database.bulkDocs(deleteChunks);
            this.clearHash();
            this._notice(`マークしたチャンク: ${result.filter((e) => "ok" in e).length} / ${deleteChunks.length}`);
        }
    }

    async removeUnusedChunks() {
        const { used, existing } = await this.allChunks();
        const existChunks = [...existing];
        const unusedChunks = existChunks.filter(([key, e]) => !used.has(e._id)).map(([key, e]) => e);
        const deleteChunks = unusedChunks.map((e) => ({
            ...e,
            data: "",
            _deleted: true,
        }));
        const size = unusedChunks.reduce((acc, e) => acc + e.data.length, 0);
        const humanSize = sizeToHumanReadable(size);
        if (deleteChunks.length == 0) {
            this._notice("未使用チャンクは見つかりませんでした。");
            return;
        }
        const message = `どのファイルからも使用されていないチャンクがあります。

- チャンク: ${deleteChunks.length} (${humanSize})

これらのチャンクを削除してよろしいですか？

注意: **削除前に、すべてのデバイスを必ず同期してください。**

> [!Note]
> 削除済みファイルから参照されているチャンクは削除されません。この操作の前に「ファイル削除を確定」を実行してください。`;

        if (await this.confirm("未使用チャンクのマーク", message, "マーク", "キャンセル")) {
            const result = await this.database.bulkDocs(deleteChunks);
            this._notice(`削除したチャンク: ${result.filter((e) => "ok" in e).length} / ${deleteChunks.length}`);
            this.clearHash();
        }
    }

    async scanUnusedChunks() {
        const kvDB = this.core.kvDB;
        const chunkSet = (await kvDB.get<Set<DocumentID>>(DB_KEY_CHUNK_SET)) || new Set();
        const chunkUsageMap = (await kvDB.get<ChunkUsageMap>(DB_KEY_DOC_USAGE_MAP)) || new Map();
        const KEEP_MAX_REVS = 10;
        const unusedSet = new Set<DocumentID>([...chunkSet]);
        for (const [, revIdMap] of chunkUsageMap) {
            const sortedRevId = [...revIdMap.entries()].sort((a, b) => getNoFromRev(b[0]) - getNoFromRev(a[0]));
            if (sortedRevId.length > KEEP_MAX_REVS) {
                // If we have more revisions than we want to keep, we need to delete the extras
            }
            const keepRevID = sortedRevId.slice(0, KEEP_MAX_REVS);
            keepRevID.forEach((e) => e[1].forEach((ee) => unusedSet.delete(ee)));
        }
        return {
            chunkSet,
            chunkUsageMap,
            unusedSet,
        };
    }
    /**
     * Track changes in the database and update the chunk usage map for garbage collection.
     * Note that this only able to perform without Fetch chunks on demand.
     */
    async trackChanges(fromStart: boolean = false, showNotice: boolean = false) {
        if (!this.isAvailable()) return;
        const logLevel = showNotice ? LOG_LEVEL_NOTICE : LOG_LEVEL_INFO;
        const kvDB = this.core.kvDB;

        const previousSeq = fromStart ? "" : await kvDB.get<string>(DB_KEY_SEQ);
        const chunkSet = (await kvDB.get<Set<DocumentID>>(DB_KEY_CHUNK_SET)) || new Set();

        const chunkUsageMap = (await kvDB.get<ChunkUsageMap>(DB_KEY_DOC_USAGE_MAP)) || new Map();

        const db = this.localDatabase.localDatabase;
        const verbose = (msg: string) => this._verbose(msg);

        const processDoc = async (doc: EntryDoc, isDeleted: boolean) => {
            if (!("children" in doc)) {
                return;
            }
            const id = doc._id;
            const rev = doc._rev!;
            const deleted = doc._deleted || isDeleted;
            const softDeleted = doc.deleted;
            const children = (doc.children || []) as DocumentID[];
            if (!chunkUsageMap.has(id)) {
                chunkUsageMap.set(id, new Map<Rev, Set<ChunkID>>());
            }
            for (const chunkId of children) {
                if (deleted) {
                    chunkUsageMap.get(id)!.delete(rev);
                    // chunkSet.add(chunkId as DocumentID);
                } else {
                    if (softDeleted) {
                        //TODO: Soft delete
                        chunkUsageMap.get(id)!.set(rev, (chunkUsageMap.get(id)!.get(rev) || new Set()).add(chunkId));
                    } else {
                        chunkUsageMap.get(id)!.set(rev, (chunkUsageMap.get(id)!.get(rev) || new Set()).add(chunkId));
                    }
                }
            }
            verbose(
                `Tracking chunk: ${id}/${rev} (${doc?.path}), deleted: ${deleted ? "yes" : "no"} Soft-Deleted:${softDeleted ? "yes" : "no"}`
            );
            return await Promise.resolve();
        };
        // let saveQueue = 0;
        const saveState = async (seq: string | number) => {
            await kvDB.set(DB_KEY_SEQ, seq);
            await kvDB.set(DB_KEY_CHUNK_SET, chunkSet);
            await kvDB.set(DB_KEY_DOC_USAGE_MAP, chunkUsageMap);
        };

        const processDocRevisions = async (doc: EntryDoc) => {
            try {
                const oldRevisions = await db.get(doc._id, { revs: true, revs_info: true, conflicts: true });
                const allRevs = oldRevisions._revs_info?.length || 0;
                const info = (oldRevisions._revs_info || [])
                    .filter((e) => e.status == "available" && e.rev != doc._rev)
                    .filter((info) => !chunkUsageMap.get(doc._id)?.has(info.rev));
                const infoLength = info.length;
                this._log(`Found ${allRevs} old revisions for ${doc._id} . ${infoLength} items to check `);
                if (info.length > 0) {
                    const oldDocs = await Promise.all(
                        info
                            .filter((revInfo) => revInfo.status == "available")
                            .map((revInfo) => db.get(doc._id, { rev: revInfo.rev }))
                    ).then((docs) => docs.filter((doc) => doc));
                    for (const oldDoc of oldDocs) {
                        await processDoc(oldDoc, false);
                    }
                }
            } catch (ex) {
                if (isNotFoundError(ex)) {
                    this._log(`No revisions found for ${doc._id}`, LOG_LEVEL_VERBOSE);
                } else {
                    this._log(`Error finding revisions for ${doc._id}`);
                    this._verbose(ex);
                }
            }
        };
        const processChange = async (doc: EntryDoc, isDeleted: boolean, seq: string | number) => {
            if (doc.type === EntryTypes.CHUNK) {
                if (isDeleted) return;
                chunkSet.add(doc._id);
            } else if ("children" in doc) {
                await processDoc(doc, isDeleted);
                await serialized("x-process-doc", async () => await processDocRevisions(doc));
            }
        };
        // Track changes
        let i = 0;
        await db
            .changes({
                since: previousSeq || "",
                live: false,
                conflicts: true,
                include_docs: true,
                style: "all_docs",
                return_docs: false,
            })
            .on("change", async (change) => {
                // handle change
                await processChange(change.doc!, change.deleted ?? false, change.seq);
                if (i++ % 100 == 0) {
                    await saveState(change.seq);
                }
            })
            .on("complete", async (info) => {
                await saveState(info.last_seq);
            });

        // Track all changed docs and new-leafs;

        const result = await this.scanUnusedChunks();

        const message = `Total chunks: ${result.chunkSet.size}\nUnused chunks: ${result.unusedSet.size}`;
        this._log(message, logLevel);
    }
    async performGC(showingNotice = false) {
        if (!this.isAvailable()) return;
        await this.trackChanges(false, showingNotice);
        const title = "すべてのデバイスは同期済みですか？";
        const confirmMessage = `この機能は、このデバイスから未使用チャンクを削除します。デバイス間に差分がある場合、競合解決時に一部のチャンクが不足する可能性があります。
実行前に必ず同期してください。

ただし、削除してしまった場合でも、修復 -> すべてのファイルで不足チャンクを再作成 を実行すると復元できる可能性があります。

未使用チャンクを削除してよろしいですか？`;

        const logLevel = showingNotice ? LOG_LEVEL_NOTICE : LOG_LEVEL_INFO;

        const BUTTON_OK = `はい、チャンクを削除します`;
        const BUTTON_CANCEL = "キャンセル";

        const result = await this.core.confirm.askSelectStringDialogue(
            confirmMessage,
            [BUTTON_OK, BUTTON_CANCEL] as const,
            {
                title,
                defaultAction: BUTTON_CANCEL,
            }
        );
        if (result !== BUTTON_OK) {
            this._log("User cancelled chunk deletion", logLevel);
            return;
        }
        const { unusedSet, chunkSet } = await this.scanUnusedChunks();
        const deleteChunks = await this.database.allDocs({
            keys: [...unusedSet],
            include_docs: true,
        });
        for (const chunk of deleteChunks.rows) {
            if ((chunk as { value?: { deleted?: boolean } })?.value?.deleted) {
                chunkSet.delete(chunk.key as DocumentID);
            }
        }
        const deleteDocs = deleteChunks.rows
            .filter((e) => "doc" in e)
            .map((e) => ({
                ...(e as { doc?: EntryLeaf }).doc!,
                _deleted: true,
            }));

        this._log(`Deleting chunks: ${deleteDocs.length}`, logLevel);
        const deleteChunkBatch = arrayToChunkedArray(deleteDocs, 100);
        let successCount = 0;
        let errored = 0;
        for (const batch of deleteChunkBatch) {
            const results = await this.database.bulkDocs(batch);
            for (const result of results) {
                if ("ok" in result) {
                    chunkSet.delete(result.id as DocumentID);
                    successCount++;
                } else {
                    this._log(`Failed to delete doc: ${result.id}`, LOG_LEVEL_VERBOSE);
                    errored++;
                }
            }
            this._log(`Deleting chunks: ${successCount} `, logLevel, "gc-preforming");
        }
        const message = `Garbage Collection completed.
Success: ${successCount}, Errored: ${errored}`;
        this._log(message, logLevel);
        const kvDB = this.core.kvDB;
        await kvDB.set(DB_KEY_CHUNK_SET, chunkSet);
    }

    // Analyse the database and report chunk usage.
    async analyseDatabase() {
        if (!this.isAvailable()) return;
        const db = this.localDatabase.localDatabase;
        // Map of chunk ID to its info
        type ChunkInfo = {
            id: DocumentID;
            refCount: number;
            length: number;
        };
        const chunkMap = new Map<DocumentID, Set<ChunkInfo>>();
        // Map of document ID to its info
        type DocumentInfo = {
            id: DocumentID;
            rev: Rev;
            chunks: Set<ChunkID>;
            uniqueChunks: Set<ChunkID>;
            sharedChunks: Set<ChunkID>;
            path: FilePathWithPrefix;
        };
        const docMap = new Map<DocumentID, Set<DocumentInfo>>();
        const info = await db.info();
        // Total number of revisions to process (approximate)
        const maxSeq = Number.parseInt(`${info.update_seq ?? 0}`, 10);
        let processed = 0;
        let read = 0;
        let errored = 0;
        // Fetch Tasks
        const ft = [] as ReturnType<typeof fetchRevision>[];
        // Fetch a specific revision of a document and make note of its chunks, or add chunk info.
        const fetchRevision = async (id: DocumentID, rev: Rev, seq: string | number) => {
            try {
                processed++;
                const doc = await db.get(id, { rev: rev });
                if (doc) {
                    if ("children" in doc) {
                        const id = doc._id;
                        const rev = doc._rev;
                        const children = (doc.children || []) as DocumentID[];
                        const set = docMap.get(id) || new Set();
                        set.add({
                            id,
                            rev,
                            chunks: new Set(children),
                            uniqueChunks: new Set(),
                            sharedChunks: new Set(),
                            path: doc.path,
                        });
                        docMap.set(id, set);
                    } else if (doc.type === EntryTypes.CHUNK) {
                        const id = doc._id;
                        if (chunkMap.has(id)) {
                            return;
                        }
                        if (doc._deleted) {
                            // Deleted chunk, skip (possibly resurrected later)
                            return;
                        }
                        const length = doc.data.length;
                        const set = chunkMap.get(id) || new Set();
                        set.add({ id, length, refCount: 0 });
                        chunkMap.set(id, set);
                    }
                    read++;
                } else {
                    this._log(`Analysing Database: not found: ${id} / ${rev}`);
                    errored++;
                }
            } catch (error) {
                this._log(`Error fetching document ${id} / ${rev}: $`, LOG_LEVEL_NOTICE);
                this._log(error, LOG_LEVEL_VERBOSE);
                errored++;
            }
            if (processed % 100 == 0) {
                this._log(`Analysing database: ${read} (${errored}) / ${maxSeq} `, LOG_LEVEL_NOTICE, "db-analyse");
            }
        };

        // Enumerate all documents and their revisions.
        const IDs = this.localDatabase.findEntryNames("", "", {});
        for await (const id of IDs) {
            const revList = await this.localDatabase.getRaw(id as DocumentID, {
                revs: true,
                revs_info: true,
                conflicts: true,
            });
            const revInfos = revList._revs_info || [];
            for (const revInfo of revInfos) {
                // All available revisions should be processed.
                // If the revision is not available, it means the revision is already tombstoned.
                if (revInfo.status == "available") {
                    // Schedule fetch task
                    ft.push(fetchRevision(id as DocumentID, revInfo.rev, 0));
                }
            }
        }
        // Wait for all fetch tasks to complete.
        await Promise.all(ft);
        // Reference count marking and unique/shared chunk classification.
        for (const [, docRevs] of docMap) {
            for (const docRev of docRevs) {
                for (const chunkId of docRev.chunks) {
                    const chunkInfos = chunkMap.get(chunkId);
                    if (chunkInfos) {
                        for (const chunkInfo of chunkInfos) {
                            if (chunkInfo.refCount === 0) {
                                docRev.uniqueChunks.add(chunkId);
                            } else {
                                docRev.sharedChunks.add(chunkId);
                            }
                            chunkInfo.refCount++;
                        }
                    }
                }
            }
        }
        // Prepare results
        const result = [];
        // Calculate total size of chunks in the given set.
        const getTotalSize = (ids: Set<DocumentID>) => {
            return [...ids].reduce((acc, chunkId) => {
                const chunkInfos = chunkMap.get(chunkId);
                if (chunkInfos) {
                    for (const chunkInfo of chunkInfos) {
                        acc += chunkInfo.length;
                    }
                }
                return acc;
            }, 0);
        };

        // Compile results for each document revision
        for (const doc of docMap.values()) {
            for (const rev of doc) {
                const title = `${rev.path} (${rev.rev})`;
                const id = rev.id;
                const revStr = `${getNoFromRev(rev.rev)}`;
                const revHash = rev.rev.split("-")[1].substring(0, 6);
                const path = rev.path;
                const uniqueChunkCount = rev.uniqueChunks.size;
                const sharedChunkCount = rev.sharedChunks.size;
                const uniqueChunkSize = getTotalSize(rev.uniqueChunks);
                const sharedChunkSize = getTotalSize(rev.sharedChunks);
                result.push({
                    title,
                    path,
                    rev: revStr,
                    revHash,
                    id,
                    uniqueChunkCount: uniqueChunkCount,
                    sharedChunkCount,
                    uniqueChunkSize: uniqueChunkSize,
                    sharedChunkSize: sharedChunkSize,
                });
            }
        }

        const titleMap = {
            title: "Title",
            id: "Document ID",
            path: "Path",
            rev: "Revision No",
            revHash: "Revision Hash",
            uniqueChunkCount: "Unique Chunk Count",
            sharedChunkCount: "Shared Chunk Count",
            uniqueChunkSize: "Unique Chunk Size",
            sharedChunkSize: "Shared Chunk Size",
        } as const;
        // Enumerate orphan chunks (not referenced by any document)
        const orphanChunks = [...chunkMap.entries()].filter(([chunkId, infos]) => {
            const totalRefCount = [...infos].reduce((acc, info) => acc + info.refCount, 0);
            return totalRefCount === 0;
        });
        const orphanChunkSize = orphanChunks.reduce((acc, [chunkId, infos]) => {
            for (const info of infos) {
                acc += info.length;
            }
            return acc;
        }, 0);
        result.push({
            title: "__orphan",
            id: "__orphan",
            path: "__orphan",
            rev: "1",
            revHash: "xxxxx",
            uniqueChunkCount: orphanChunks.length,
            sharedChunkCount: 0,
            uniqueChunkSize: orphanChunkSize,
            sharedChunkSize: 0,
        } as const);

        const csvSrc = result.map((e) => {
            return [
                `${e.title.replace(/"/g, '""')}"`,
                `${e.id}`,
                `${e.path}`,
                `${e.rev}`,
                `${e.revHash}`,
                `${e.uniqueChunkCount}`,
                `${e.sharedChunkCount}`,
                `${e.uniqueChunkSize}`,
                `${e.sharedChunkSize}`,
            ].join("\t");
        });
        // Add title row
        csvSrc.unshift(Object.values(titleMap).join("\t"));
        const csv = csvSrc.join("\n");

        // Prompt to copy to clipboard
        await this.services.UI.promptCopyToClipboard("Database Analysis data (TSV):", csv);
    }

    async compactDatabase() {
        const replicator = this.core.replicator as LiveSyncCouchDBReplicator;
        const remote = await replicator.connectRemoteCouchDBWithSetting(this.settings, false, false, true);
        if (!remote) {
            this._notice("Failed to connect to remote for compaction.", "gc-compact");
            return;
        }
        if (typeof remote == "string") {
            this._notice(`Failed to connect to remote for compaction. ${remote}`, "gc-compact");
            return;
        }
        const compactResult = await remote.db.compact({
            interval: 1000,
        });
        // Probably no need to wait, but just in case.
        let timeout = 2 * 60 * 1000; // 2 minutes
        for (;;) {
            const status = await remote.db.info();
            if ("compact_running" in status && status?.compact_running) {
                this._notice("Compaction in progress on remote database...", "gc-compact");
                await delay(2000);
                timeout -= 2000;
                if (timeout <= 0) {
                    this._notice("Compaction on remote database timed out.", "gc-compact");
                    break;
                }
            } else {
                break;
            }
        }
        if (compactResult && "ok" in compactResult) {
            this._notice("Compaction on remote database completed successfully.", "gc-compact");
        } else {
            this._notice("Compaction on remote database failed.", "gc-compact");
        }
    }

    // /**
    //  * Compact the database by temporarily setting the revision limit to 1.
    //  * @returns
    //  */
    // async compactDatabaseWithRevLimit() {
    //     // Temporarily set revs_limit to 1, perform compaction, and restore the original revs_limit.
    //     // Very dangerous operation, so now suppressed.
    //     return Promise.resolve(false);
    //     const replicator = this.core.replicator as LiveSyncCouchDBReplicator;
    //     const remote = await replicator.connectRemoteCouchDBWithSetting(this.settings, false, false, true);
    //     if (!remote) {
    //         this._notice("Failed to connect to remote for compaction.");
    //         return;
    //     }
    //     if (typeof remote == "string") {
    //         this._notice(`Failed to connect to remote for compaction. ${remote}`);
    //         return;
    //     }
    //     const customHeaders = parseHeaderValues(this.settings.couchDB_CustomHeaders);
    //     const credential = generateCredentialObject(this.settings);
    //     const request = async (path: string, method: string = "GET", body: any = undefined) => {
    //         const req = await _requestToCouchDB(
    //             this.settings.couchDB_URI.replace(/\/+$/, "") +
    //             (this.settings.couchDB_DBNAME ? `/${this.settings.couchDB_DBNAME}` : ""),
    //             credential,
    //             window.origin,
    //             path,
    //             body,
    //             method,
    //             customHeaders
    //         );
    //         return req;
    //     };
    //     let revsLimit = "";
    //     const req = await request(`_revs_limit`, "GET");
    //     if (req.status == 200) {
    //         revsLimit = req.text.trim();
    //         this._info(`Remote database _revs_limit: ${revsLimit}`);
    //     } else {
    //         this._notice(`Failed to get remote database _revs_limit. Status: ${req.status}`);
    //         return;
    //     }
    //     const req2 = await request(`_revs_limit`, "PUT", 1);
    //     if (req2.status == 200) {
    //         this._info(`Set remote database _revs_limit to 1 for compaction.`);
    //     }
    //     try {
    //         await this.compactDatabase();
    //     } finally {
    //         // Restore revs_limit
    //         if (revsLimit) {
    //             const req3 = await request(`_revs_limit`, "PUT", parseInt(revsLimit));
    //             if (req3.status == 200) {
    //                 this._info(`Restored remote database _revs_limit to ${revsLimit}.`);
    //             } else {
    //                 this._notice(
    //                     `Failed to restore remote database _revs_limit. Status: ${req3.status} / ${req3.text}`
    //                 );
    //             }
    //         }
    //     }
    // }
    async gcv3() {
        if (!this.isAvailable()) return;
        const replicator = this.core.replicator as LiveSyncCouchDBReplicator;
        // Start one-shot replication to ensure all changes are synced before GC.
        const r0 = await replicator.openOneShotReplication(this.settings, false, false, "sync");
        if (!r0) {
            this._notice(
                "Failed to start one-shot replication before Garbage Collection. Garbage Collection Cancelled."
            );
            return;
        }

        // Delete the chunk, but first verify the following:
        // Fetch the list of accepted nodes from the replicator.
        const OPTION_CANCEL = "Cancel Garbage Collection";
        const info = await this.core.replicator.getConnectedDeviceList();
        if (!info) {
            this._notice("接続済みデバイス情報が見つかりません。ガベージコレクションをキャンセルします。");
            return;
        }
        const { accepted_nodes, node_info } = info;
        //1. Compare accepted_nodes and node_info, and confirm whether it is acceptable to delete nodes not present in node_info.
        const infoMissingNodes = [] as string[];
        for (const node of accepted_nodes) {
            if (!(node in node_info)) {
                infoMissingNodes.push(node);
            }
        }
        if (infoMissingNodes.length > 0) {
            const message = `次の承認済みノードのノード情報が見つかりません:\n- ${infoMissingNodes.join("\n- ")}\n\nしばらく接続されていないか、古いバージョンのままになっている可能性があります。
可能であれば、すべてのデバイスを更新することをお勧めします。使用していないデバイスがある場合は、リモートを一度ロックすることで承認済みノードをすべてクリアできます。`;

            const OPTION_IGNORE = "無視して続行";
            // const OPTION_DELETE = "Delete them and proceed";
            const buttons = [OPTION_CANCEL, OPTION_IGNORE] as const;
            const result = await this.core.confirm.askSelectStringDialogue(message, buttons, {
                title: "ノード情報が見つかりません",
                defaultAction: OPTION_CANCEL,
            });
            if (result === OPTION_CANCEL) {
                this._notice("ガベージコレクションはユーザーによりキャンセルされました。");
                return;
            } else if (result === OPTION_IGNORE) {
                this._notice("不足しているノードを無視してガベージコレクションを続行します。");
            }
        }

        //2. Check whether the progress values in NodeData are roughly the same (only the numerical part is needed).
        const progressValues = Object.values(node_info)
            .map((e) => e.progress.split("-")[0])
            .map((e) => parseInt(e));
        const maxProgress = Math.max(...progressValues);
        const minProgress = Math.min(...progressValues);
        const progressDifference = maxProgress - minProgress;
        const OPTION_PROCEED = "ガベージコレクションを続行";
        //   - If they differ significantly, the node may not have completed synchronisation, potentially causing conflicts. Display a confirmation dialog as a precaution.
        // - If they are not significantly different, display the standard confirmation dialogue message.

        const detail = `> [!INFO]- 接続済みデバイスは次のように検出されました:
${Object.entries(node_info)
    .map(
        ([nodeId, nodeData]) =>
            `> - デバイス: ${nodeData.device_name} (ノードID: ${nodeId})
>   - Obsidian バージョン: ${nodeData.app_version}
>   - プラグインバージョン: ${nodeData.plugin_version}
>   - 進捗: ${nodeData.progress.split("-")[0]}`
    )
    .join("\n")}
`;
        const message =
            progressDifference != 0
                ? `一部のデバイスで進捗値が異なります (最大: ${maxProgress}, 最小: ${minProgress})。
一部のデバイスで同期が完了しておらず、競合につながる可能性があります。続行前に、すべてのデバイスが同期済みであることを確認することを強くお勧めします。`
                : `すべてのデバイスの進捗値は同じです (${maxProgress})。デバイスは同期済みと見なせるため、ガベージコレクションを続行できます。`;
        const buttons = [OPTION_PROCEED, OPTION_CANCEL] as const;
        const defaultAction = progressDifference != 0 ? OPTION_CANCEL : OPTION_PROCEED;
        const result = await this.core.confirm.askSelectStringDialogue(message + "\n\n" + detail, buttons, {
            title: "ガベージコレクションの確認",
            defaultAction,
        });
        if (result !== OPTION_PROCEED) {
            this._notice("ガベージコレクションはユーザーによりキャンセルされました。");
            return;
        }
        this._notice("ガベージコレクションを続行します。");
        //-  3. Once OK is confirmed in the dialogue, execute the chunk deletion. This is performed on the local database and immediately reflected on the remote. After reflecting on the remote, perform compaction.
        const gcStartTime = Date.now();
        // Perform Garbage Collection (new implementation).
        const localDatabase = this.localDatabase.localDatabase;
        const usedChunks = new Set<DocumentID>();
        const allChunks = new Map<DocumentID, string>();

        const IDs = this.localDatabase.findEntryNames("", "", {});
        let i = 0;
        const doc_count = (await localDatabase.info()).doc_count;
        for await (const id of IDs) {
            const doc = await this.localDatabase.getRaw(id as DocumentID);
            i++;
            if (i % 100 == 0) {
                this._notice(`Garbage Collection: Scanned ${i} / ~${doc_count} `, "gc-scanning");
            }
            if (!doc) continue;
            if ("children" in doc) {
                const children = (doc.children || []) as DocumentID[];
                for (const chunkId of children) {
                    usedChunks.add(chunkId);
                }
            } else if (doc.type === EntryTypes.CHUNK) {
                allChunks.set(doc._id, doc._rev);
            }
        }
        this._notice(
            `Garbage Collection: Scanning completed. Total chunks: ${allChunks.size}, Used chunks: ${usedChunks.size}`,
            "gc-scanning"
        );

        const unusedChunks = [...allChunks.keys()].filter((e) => !usedChunks.has(e));
        this._notice(`Garbage Collection: Found ${unusedChunks.length} unused chunks to delete.`, "gc-scanning");
        const deleteChunkDocs = unusedChunks.map(
            (chunkId) =>
                ({
                    _id: chunkId,
                    _deleted: true,
                    _rev: allChunks.get(chunkId),
                }) as EntryLeaf
        );
        const response = await localDatabase.bulkDocs(deleteChunkDocs);
        const deletedCount = response.filter((e) => "ok" in e).length;
        const gcEndTime = Date.now();
        this._notice(
            `Garbage Collection completed. Deleted chunks: ${deletedCount} / ${unusedChunks.length}. Time taken: ${(gcEndTime - gcStartTime) / 1000} seconds.`
        );
        // Send changes to remote
        const r = await replicator.openOneShotReplication(this.settings, false, false, "pushOnly");
        // Wait for replication to complete
        if (!r) {
            this._notice("Failed to start replication after Garbage Collection.");
            return;
        }
        // Perform compaction
        await this.compactDatabase();
        this.clearHash();
    }
}
