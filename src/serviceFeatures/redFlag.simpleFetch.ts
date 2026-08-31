import { LOG_LEVEL_NOTICE } from "octagonal-wheels/common/logger";
import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import { type LogFunction } from "@vrtmrz/livesync-commonlib/compat/services/lib/logUtils";
import { UnresolvedErrorManager } from "@vrtmrz/livesync-commonlib/compat/services/base/UnresolvedErrorManager";
import {
    ExtraOnLocal,
    ExtraOnRemote,
    FullScanModes,
    normaliseFullScanOptions,
    synchroniseAllFilesBetweenDBandStorage,
    type FullScanOptions,
} from "@vrtmrz/livesync-commonlib/compat/serviceFeatures/offlineScanner";
import {
    adjustSettingToRemoteIfNeeded,
    cancelScheduledInitialisation,
    processVaultInitialisation,
} from "./redFlag";
import { $msg } from "@/common/translation";

export const SIMPLE_FETCH_STAGE1_REMOTE_WINS = `すべてをリモートファイルで上書き`;
export const SIMPLE_FETCH_STAGE1_NEWER_WINS = `更新日時を比較して新しい方を採用`;
export const SIMPLE_FETCH_STAGE1_DETAILED = `詳細な手順を使用`;
export const SIMPLE_FETCH_STAGE1_CANCEL = $msg("Cancel");

export const SIMPLE_FETCH_STAGE2_REMOTE_DELETE_NONE = `リモートにないローカルファイルも保持`;
export const SIMPLE_FETCH_STAGE2_REMOTE_DELETE_ALL = `リモートにないローカルファイルを削除`;

export const SIMPLE_FETCH_STAGE2_NEWER_CLEANUP = `リモートで削除されたローカルファイルを削除`;
export const SIMPLE_FETCH_STAGE2_NEWER_SYNC_ALL = `リモートで削除されていてもローカルファイルを保持`;
export const STAGE2_ABORT = `すべて中止して再起動`;

const SIMPLE_FETCH_MODE_KEY = "simple-fetch-mode";

function buildSimpleFetchResult(stage1: string, stage2?: string) {
    if (stage1 === SIMPLE_FETCH_STAGE1_DETAILED) {
        return { mode: "detailed", options: {} };
    }
    if (stage1 === SIMPLE_FETCH_STAGE1_REMOTE_WINS && stage2) {
        if (![SIMPLE_FETCH_STAGE2_REMOTE_DELETE_ALL, SIMPLE_FETCH_STAGE2_REMOTE_DELETE_NONE].some((v) => v === stage2)) {
            return undefined;
        }
        return {
            mode: "remote-only",
            options: {
                mode: FullScanModes.DB_APPLY,
                extraOnRemote:
                    stage2 === SIMPLE_FETCH_STAGE2_REMOTE_DELETE_ALL ? ExtraOnRemote.DELETE_LOCAL_MISSING : undefined,
            },
        };
    }
    if (stage1 === SIMPLE_FETCH_STAGE1_NEWER_WINS && stage2) {
        if (![SIMPLE_FETCH_STAGE2_NEWER_CLEANUP, SIMPLE_FETCH_STAGE2_NEWER_SYNC_ALL].some((v) => v === stage2)) {
            return undefined;
        }
        return {
            mode: "newer-wins",
            options: {
                mode: FullScanModes.NEWER_WINS,
                extraOnLocal:
                    stage2 === SIMPLE_FETCH_STAGE2_NEWER_CLEANUP
                        ? ExtraOnLocal.DELETE_DB_DELETED
                        : ExtraOnLocal.APPEND_STORAGE_ONLY,
            },
        };
    }
    return undefined;
}

function rememberSimpleFetchMode(host: NecessaryServices<"setting", never>, stage1: string, stage2?: string) {
    host.services.setting.setSmallConfig(SIMPLE_FETCH_MODE_KEY, JSON.stringify({ stage1, stage2 }));
}

function getRememberedSimpleFetchMode(host: NecessaryServices<"setting", never>) {
    const saved = host.services.setting.getSmallConfig(SIMPLE_FETCH_MODE_KEY);
    if (!saved) return undefined;
    try {
        const { stage1, stage2 } = JSON.parse(saved) as { stage1?: string; stage2?: string };
        if (stage1) {
            const remembered = buildSimpleFetchResult(stage1, stage2);
            if (remembered) return remembered;
        }
    } catch {
        // Clear below; the saved choice is optional and can be rebuilt by asking again.
    }
    host.services.setting.deleteSmallConfig(SIMPLE_FETCH_MODE_KEY);
    return undefined;
}

function clearRememberedSimpleFetchMode(host: NecessaryServices<"setting", never>) {
    host.services.setting.deleteSmallConfig(SIMPLE_FETCH_MODE_KEY);
}

export async function askSimpleFetchMode(
    host: NecessaryServices<"UI" | "setting", never>
): Promise<{ mode: string; options: Partial<FullScanOptions> } | "cancelled" | "aborted"> {
    const remembered = getRememberedSimpleFetchMode(host);
    if (remembered) return remembered;

    const msg = `リモートデータを取得します。

最初に、リモートから取得するデータの扱い方を選択してください。

- **${SIMPLE_FETCH_STAGE1_NEWER_WINS}**：ファイルの更新日時を比較し、新しい方を採用します。
  複数のデバイスで変更していた場合に、更新日時に基づいて変更を統合できます。
- **${SIMPLE_FETCH_STAGE1_REMOTE_WINS}**：リモートデータを正として扱います。
  ローカルファイルはリモートデータで上書きされるため、重要なデータがある場合は必ずバックアップしてください。
- **${SIMPLE_FETCH_STAGE1_DETAILED}**：詳細なセットアップウィザードを開きます。
  同期処理を細かく制御したい場合や、適用前に変更を確認したい場合に選択してください。`;
    const stage1 = await host.services.UI.confirm.confirmWithMessage(
        `データ取得を開始`,
        msg,
        [
            SIMPLE_FETCH_STAGE1_NEWER_WINS,
            SIMPLE_FETCH_STAGE1_REMOTE_WINS,
            SIMPLE_FETCH_STAGE1_DETAILED,
            SIMPLE_FETCH_STAGE1_CANCEL,
        ],
        SIMPLE_FETCH_STAGE1_NEWER_WINS,
        0
    );

    if (!stage1 || stage1 === SIMPLE_FETCH_STAGE1_CANCEL) return "cancelled";

    if (stage1 === SIMPLE_FETCH_STAGE1_DETAILED) {
        return buildSimpleFetchResult(stage1)!;
    }

    if (stage1 === SIMPLE_FETCH_STAGE1_REMOTE_WINS) {
        const msg = `ローカルファイルをリモートデータで上書きする場合、**リモートデータベースに存在しないローカルファイルをどのように扱いますか？**

- **${SIMPLE_FETCH_STAGE2_REMOTE_DELETE_ALL}**：ローカルにのみ存在するファイルと、リモートで削除されたファイルを削除します。
  ローカルVaultはリモートデータベースと同じ状態になります。重要なデータがある場合は必ずバックアップしてください。
- **${SIMPLE_FETCH_STAGE2_REMOTE_DELETE_NONE}**：既存のローカルファイルをすべて保持します。
  ローカルファイルは保持されますが、リモートに存在しないファイルがあると重複が発生する可能性があります。同期後に手動で整理できます。`;

        const stage2 = await host.services.UI.confirm.confirmWithMessage(
            `リモートにない既存のローカルファイルをどう扱いますか？`,
            msg,
            [SIMPLE_FETCH_STAGE2_REMOTE_DELETE_ALL, SIMPLE_FETCH_STAGE2_REMOTE_DELETE_NONE, STAGE2_ABORT],
            SIMPLE_FETCH_STAGE2_REMOTE_DELETE_NONE,
            0
        );
        if (!stage2) return "cancelled";
        if (stage2 === STAGE2_ABORT) {
            return "aborted";
        }
        rememberSimpleFetchMode(host, stage1, stage2);
        return buildSimpleFetchResult(stage1, stage2)!;
    }

    if (stage1 === SIMPLE_FETCH_STAGE1_NEWER_WINS) {
        const msg = `ほかのデバイスで削除されたファイルをどのように扱いますか？

- **${SIMPLE_FETCH_STAGE2_NEWER_CLEANUP}**：リモートで削除されたローカルファイルも削除します。
  デバイス間でVaultを整理された一貫した状態に保てます。重要なデータがある場合は必ずバックアップしてください。
- **${SIMPLE_FETCH_STAGE2_NEWER_SYNC_ALL}**：リモートで削除されていても、ローカルファイルから再作成します。
  ローカルファイルは保持されますが、重複が発生する可能性があります。同期後に手動で整理できます。`;

        const stage2 = await host.services.UI.confirm.confirmWithMessage(
            `競合と削除の設定`,
            msg,
            [SIMPLE_FETCH_STAGE2_NEWER_CLEANUP, SIMPLE_FETCH_STAGE2_NEWER_SYNC_ALL, STAGE2_ABORT],
            SIMPLE_FETCH_STAGE2_NEWER_SYNC_ALL,
            0
        );
        if (!stage2) return "cancelled";
        if (stage2 === STAGE2_ABORT) {
            return "aborted";
        }
        rememberSimpleFetchMode(host, stage1, stage2);
        return buildSimpleFetchResult(stage1, stage2)!;
    }

    return "cancelled";
}

const RERUN_PROCESS = `再起動して処理をやり直す`;
const RELEASE_FLAG_PROCESS = `処理を完了して通常動作を再開`;
export async function askAndPerformFastSetupOnScheduledFetchAll(
    host: NecessaryServices<
        | "vault"
        | "fileProcessing"
        | "tweakValue"
        | "UI"
        | "setting"
        | "appLifecycle"
        | "path"
        | "keyValueDB"
        | "database",
        "storageAccess" | "rebuilder" | "fileHandler"
    >,
    log: LogFunction,
    cleanupFlag: () => Promise<void>
): Promise<boolean | undefined> {
    const result = await askSimpleFetchMode(host);
    if (result === "cancelled") {
        log("Fetch cancelled by user.", LOG_LEVEL_NOTICE);
        clearRememberedSimpleFetchMode(host);
        return await cancelScheduledInitialisation(host, cleanupFlag);
    }
    if (result === "aborted") {
        log("Fetch exited by user.", LOG_LEVEL_NOTICE);
        clearRememberedSimpleFetchMode(host);
        host.services.appLifecycle.performRestart();
        return false;
    }
    if (result.mode === "detailed") {
        return undefined; // Let the detailed setup flow handle it.
    }

    const settings = host.services.setting.currentSettings();
    if (!(await adjustSettingToRemoteIfNeeded(host, log, { preventFetchingConfig: false }, settings))) {
        log("Fetch initialisation cancelled by user.", LOG_LEVEL_NOTICE);
        clearRememberedSimpleFetchMode(host);
        return await cancelScheduledInitialisation(host, cleanupFlag);
    }

    const performFastSetup = async () => {
        // 1. Perform fast DB fetch (download remote DB content to local DB)
        await host.serviceModules.rebuilder.$fetchLocalDBFast(false);

        // 2. Call the extended synchroniseAllFilesBetweenDBandStorage to reflect changes in storage
        const errorManager = new UnresolvedErrorManager(host.services.appLifecycle, host.services.context.events);
        const syncResult = await synchroniseAllFilesBetweenDBandStorage(
            host,
            log,
            errorManager,
            normaliseFullScanOptions({
                ...result.options,
                showingNotice: true,
                omitEvents: true,
                ignoreSuspending: true,
            })
        );
        if (!syncResult) {
            const canRelease = await host.services.UI.confirm.askSelectStringDialogue(
                `一部のファイルを同期できませんでした。どうしますか？`,
                [RERUN_PROCESS, RELEASE_FLAG_PROCESS],
                { defaultAction: RELEASE_FLAG_PROCESS, title: `同期の問題を検出` }
            );
            if (canRelease === RERUN_PROCESS) {
                log("User chose to reboot and re-run the process.", LOG_LEVEL_NOTICE);
                // Prevent to delete the flag, so that the process will be re-run after reboot.
                // await cleanupFlag();
                host.services.appLifecycle.performRestart();
                return false;
            }
        }
        await host.serviceModules.rebuilder.finishRebuild();
        await cleanupFlag();
        clearRememberedSimpleFetchMode(host);
        log("Simple fetch and scan operation completed.", LOG_LEVEL_NOTICE);
        return true;
    };
    return await processVaultInitialisation(host, log, performFastSetup, "keep-on-failure");
}
