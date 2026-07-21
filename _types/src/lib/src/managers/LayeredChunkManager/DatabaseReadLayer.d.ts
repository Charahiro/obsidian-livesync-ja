// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import type { EntryLeaf, DocumentID, EntryDoc } from "@lib/common/types";
import type { IReadLayer } from "./ChunkLayerInterfaces";
import type { ChunkReadOptions } from "./types.ts";
/**
 * Database read layer - reads chunks from the database
 */
export declare class DatabaseReadLayer implements IReadLayer {
    private database;
    constructor(database: PouchDB.Database<EntryDoc>);
    private isChunkDoc;
    private getError;
    private isMissingError;
    read(ids: DocumentID[], options: ChunkReadOptions, next: (remaining: DocumentID[]) => Promise<(EntryLeaf | false)[]>): Promise<(EntryLeaf | false)[]>;
}
