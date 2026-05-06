import { EVENT_REQUEST_PERFORM_GC_V3, eventHub } from "@/common/events.ts";
import { LOG_LEVEL_NOTICE, Logger } from "../../../lib/src/common/logger.ts";
import { FlagFilesHumanReadable, FLAGMD_REDFLAG } from "../../../lib/src/common/types.ts";
import { fireAndForget } from "../../../lib/src/common/utils.ts";
import { LiveSyncCouchDBReplicator } from "../../../lib/src/replication/couchdb/LiveSyncReplicator.ts";
import { LiveSyncSetting as Setting } from "./LiveSyncSetting.ts";
import type { ObsidianLiveSyncSettingTab } from "./ObsidianLiveSyncSettingTab";
import { visibleOnly, type PageFunctions } from "./SettingPane";
export function paneMaintenance(
    this: ObsidianLiveSyncSettingTab,
    paneEl: HTMLElement,
    { addPanel }: PageFunctions
): void {
    const isRemoteLockedAndDeviceNotAccepted = () => this.core?.replicator?.remoteLockedAndDeviceNotAccepted;
    const isRemoteLocked = () => this.core?.replicator?.remoteLocked;
    // if (this.plugin?.replicator?.remoteLockedAndDeviceNotAccepted) {
    this.createEl(
        paneEl,
        "div",
        {
            text: "このデバイスが「解決済み」としてマークされていないため、保管庫の破損を防ぐ目的でリモートデータベースの同期がロックされています。保管庫をバックアップし、ローカルデータベースをリセットしてから「このデバイスを解決済みにする」を選択してください。この警告は、レプリケーションでデバイスが解決済みと確認されるまで表示されます。",
            cls: "op-warn",
        },
        (c) => {
            this.createEl(
                c,
                "button",
                {
                    text: "バックアップ済み、このデバイスを解決済みにする",
                    cls: "mod-warning",
                },
                (e) => {
                    e.addEventListener("click", () => {
                        fireAndForget(async () => {
                            await this.services.replication.markResolved();
                            this.display();
                        });
                    });
                }
            );
        },
        visibleOnly(isRemoteLockedAndDeviceNotAccepted)
    );
    this.createEl(
        paneEl,
        "div",
        {
            text: "意図しない保管庫の破損を防ぐため、リモートデータベースの同期がロックされています。このデバイスは「解決済み」としてマークされています。すべてのデバイスが「解決済み」になったら、データベースのロックを解除してください。この警告は、レプリケーションでデバイスが解決済みと確認されるまで表示されます。",
            cls: "op-warn",
        },
        (c) =>
            this.createEl(
                c,
                "button",
                {
                    text: "準備完了、データベースのロックを解除",
                    cls: "mod-warning",
                },
                (e) => {
                    e.addEventListener("click", () => {
                        fireAndForget(async () => {
                            await this.services.replication.markUnlocked();
                            this.display();
                        });
                    });
                }
            ),
        visibleOnly(isRemoteLocked)
    );

    void addPanel(paneEl, "緊急操作").then((paneEl) => {
        new Setting(paneEl)
            .setName("サーバーをロック")
            .setDesc("他のデバイスとの同期を防ぐため、リモートサーバーをロックします。")
            .addButton((button) =>
                button
                    .setButtonText("ロック")
                    .setDisabled(false)
                    .setWarning()
                    .onClick(async () => {
                        await this.services.replication.markLocked();
                    })
            )
            .addOnUpdate(this.onlyOnCouchDBOrMinIO);

        new Setting(paneEl)
            .setName("緊急再起動")
            .setDesc("すべての同期を無効にして再起動します。")
            .addButton((button) =>
                button
                    .setButtonText("フラグを作成して再起動")
                    .setDisabled(false)
                    .setWarning()
                    .onClick(async () => {
                        await this.core.storageAccess.writeFileAuto(FLAGMD_REDFLAG, "");
                        this.services.appLifecycle.performRestart();
                    })
            );
    });

    void addPanel(paneEl, "同期情報のリセット").then((paneEl) => {
        new Setting(paneEl)
            .setName("このデバイスの同期情報をリセット")
            .setDesc("リモートからローカルデータベースを復元または再構築します。")
            .addButton((button) =>
                button
                    .setButtonText("予約して再起動")
                    .setCta()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.core.storageAccess.writeFileAuto(FlagFilesHumanReadable.FETCH_ALL, "");
                        this.services.appLifecycle.performRestart();
                    })
            );
        new Setting(paneEl)
            .setName("このデバイスのファイルでサーバーデータを上書き")
            .setDesc("ローカルファイルを使って、ローカルとリモートのデータベースを再構築します。")
            .addButton((button) =>
                button
                    .setButtonText("予約して再起動")
                    .setCta()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.core.storageAccess.writeFileAuto(FlagFilesHumanReadable.REBUILD_ALL, "");
                        this.services.appLifecycle.performRestart();
                    })
            );
    });

    void addPanel(paneEl, "同期", () => {}, this.onlyOnCouchDBOrMinIO).then((paneEl) => {
        new Setting(paneEl)
            .setName("再送信")
            .setDesc("すべてのチャンクをリモートへ再送信します。")
            .addButton((button) =>
                button
                    .setButtonText("チャンクを送信")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        if (this.core.replicator instanceof LiveSyncCouchDBReplicator) {
                            await this.core.replicator.sendChunks(this.core.settings, undefined, true, 0);
                        }
                    })
            )
            .addOnUpdate(this.onlyOnCouchDB);

        new Setting(paneEl)
            .setName("ジャーナル受信履歴をリセット")
            .setDesc(
                "ジャーナルの受信履歴を初期化します。次回同期時に、このデバイスが送信したもの以外のすべての項目が再ダウンロードされます。"
            )
            .addButton((button) =>
                button
                    .setButtonText("受信履歴をリセット")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.getMinioJournalSyncClient().updateCheckPointInfo((info) => ({
                            ...info,
                            receivedFiles: new Set(),
                            knownIDs: new Set(),
                        }));
                        Logger(`ジャーナル受信履歴をクリアしました。`, LOG_LEVEL_NOTICE);
                    })
            )
            .addOnUpdate(this.onlyOnMinIO);

        new Setting(paneEl)
            .setName("ジャーナル送信履歴をリセット")
            .setDesc(
                "ジャーナルの送信履歴を初期化します。次回同期時に、このデバイスが受信したもの以外のすべての項目が再送信されます。"
            )
            .addButton((button) =>
                button
                    .setButtonText("送信履歴をリセット")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.getMinioJournalSyncClient().updateCheckPointInfo((info) => ({
                            ...info,
                            lastLocalSeq: 0,
                            sentIDs: new Set(),
                            sentFiles: new Set(),
                        }));
                        Logger(`ジャーナル送信履歴をクリアしました。`, LOG_LEVEL_NOTICE);
                    })
            )
            .addOnUpdate(this.onlyOnMinIO);
    });
    void addPanel(paneEl, "ガベージコレクション V3 (ベータ)", (e) => e, this.onlyOnP2POrCouchDB).then((paneEl) => {
        new Setting(paneEl)
            .setName("ガベージコレクションを実行")
            .setDesc("未使用のチャンクを削除してデータベースサイズを削減するため、ガベージコレクションを実行します。")
            .addButton((button) =>
                button
                    .setButtonText("ガベージコレクションを実行")
                    .setDisabled(false)
                    .onClick(() => {
                        this.closeSetting();
                        eventHub.emitEvent(EVENT_REQUEST_PERFORM_GC_V3);
                    })
            );
    });
    // void addPanel(paneEl, "Garbage Collection (Beta2)", (e) => e, this.onlyOnP2POrCouchDB).then((paneEl) => {
    //     new Setting(paneEl)
    //         .setName("Scan garbage")
    //         .setDesc("Scan for garbage chunks in the database.")
    //         .addButton((button) =>
    //             button
    //                 .setButtonText("Scan")
    //                 // .setWarning()
    //                 .setDisabled(false)
    //                 .onClick(async () => {
    //                     await this.plugin
    //                         .getAddOn<LocalDatabaseMaintenance>(LocalDatabaseMaintenance.name)
    //                         ?.trackChanges(false, true);
    //                 })
    //         )
    //         .addButton((button) =>
    //             button.setButtonText("Rescan").onClick(async () => {
    //                 await this.plugin
    //                     .getAddOn<LocalDatabaseMaintenance>(LocalDatabaseMaintenance.name)
    //                     ?.trackChanges(true, true);
    //             })
    //         );
    //     new Setting(paneEl)
    //         .setName("Collect garbage")
    //         .setDesc("Remove all unused chunks from the local database.")
    //         .addButton((button) =>
    //             button
    //                 .setButtonText("Collect")
    //                 .setWarning()
    //                 .setDisabled(false)
    //                 .onClick(async () => {
    //                     await this.plugin
    //                         .getAddOn<LocalDatabaseMaintenance>(LocalDatabaseMaintenance.name)
    //                         ?.performGC(true);
    //                 })
    //         );
    //     new Setting(paneEl)
    //         .setName("Commit File Deletion")
    //         .setDesc("Completely delete all deleted documents from the local database.")
    //         .addButton((button) =>
    //             button
    //                 .setButtonText("Delete")
    //                 .setWarning()
    //                 .setDisabled(false)
    //                 .onClick(async () => {
    //                     await this.plugin
    //                         .getAddOn<LocalDatabaseMaintenance>(LocalDatabaseMaintenance.name)
    //                         ?.commitFileDeletion();
    //                 })
    //         );
    // });
    // void addPanel(paneEl, "Garbage Collection (Old and Experimental)", (e) => e, this.onlyOnP2POrCouchDB).then(
    //     (paneEl) => {
    //         new Setting(paneEl)
    //             .setName("Remove all orphaned chunks")
    //             .setDesc("Remove all orphaned chunks from the local database.")
    //             .addButton((button) =>
    //                 button
    //                     .setButtonText("Remove")
    //                     .setWarning()
    //                     .setDisabled(false)
    //                     .onClick(async () => {
    //                         await this.plugin
    //                             .getAddOn<LocalDatabaseMaintenance>(LocalDatabaseMaintenance.name)
    //                             ?.removeUnusedChunks();
    //                     })
    //             );

    //         new Setting(paneEl)
    //             .setName("Resurrect deleted chunks")
    //             .setDesc(
    //                 "If you have deleted chunks before fully synchronised and missed some chunks, you possibly can resurrect them."
    //             )
    //             .addButton((button) =>
    //                 button
    //                     .setButtonText("Try resurrect")
    //                     .setWarning()
    //                     .setDisabled(false)
    //                     .onClick(async () => {
    //                         await this.plugin
    //                             .getAddOn<LocalDatabaseMaintenance>(LocalDatabaseMaintenance.name)
    //                             ?.resurrectChunks();
    //                     })
    //             );
    //     }
    // );

    void addPanel(paneEl, "再構築操作 (リモートのみ)", () => {}, this.onlyOnCouchDBOrMinIO).then((paneEl) => {
        new Setting(paneEl)
            .setName("クリーンアップを実行")
            .setDesc(
                "最新ではないリビジョンをすべて破棄して、使用するストレージ容量を削減します。リモートサーバーとローカルクライアントの両方に、同量の空き容量が必要です。"
            )
            .addButton((button) =>
                button
                    .setButtonText("実行")
                    .setDisabled(false)
                    .onClick(async () => {
                        const replicator = this.core.replicator as LiveSyncCouchDBReplicator;
                        Logger(`クリーンアップを開始しました`, LOG_LEVEL_NOTICE, "compaction");
                        if (await replicator.compactRemote(this.editingSettings)) {
                            Logger(`クリーンアップが完了しました。`, LOG_LEVEL_NOTICE, "compaction");
                        } else {
                            Logger(`クリーンアップに失敗しました。`, LOG_LEVEL_NOTICE, "compaction");
                        }
                    })
            )
            .addOnUpdate(this.onlyOnCouchDB);

        new Setting(paneEl)
            .setName("リモートを上書き")
            .setDesc("ローカルデータベースとパスフレーズでリモートを上書きします。")
            .addButton((button) =>
                button
                    .setButtonText("送信")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.rebuildDB("remoteOnly");
                    })
            );

        new Setting(paneEl)
            .setName("すべてのジャーナルカウンターをリセット")
            .setDesc("すべてのジャーナル履歴を初期化します。次回同期時に、すべての項目が受信および送信されます。")
            .addButton((button) =>
                button
                    .setButtonText("すべてリセット")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.getMinioJournalSyncClient().resetCheckpointInfo();
                        Logger(`ジャーナル交換履歴をクリアしました。`, LOG_LEVEL_NOTICE);
                    })
            )
            .addOnUpdate(this.onlyOnMinIO);

        new Setting(paneEl)
            .setName("すべてのジャーナルカウンターを消去")
            .setDesc("すべてのダウンロード/アップロードキャッシュを消去します。")
            .addButton((button) =>
                button
                    .setButtonText("すべてリセット")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.getMinioJournalSyncClient().resetAllCaches();
                        Logger(`ジャーナルのダウンロード/アップロードキャッシュをクリアしました。`, LOG_LEVEL_NOTICE);
                    })
            )
            .addOnUpdate(this.onlyOnMinIO);

        new Setting(paneEl)
            .setName("完全初期化")
            .setDesc("リモートサーバー上のすべてのデータを削除します。")
            .addButton((button) =>
                button
                    .setButtonText("削除")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.getMinioJournalSyncClient().updateCheckPointInfo((info) => ({
                            ...info,
                            receivedFiles: new Set(),
                            knownIDs: new Set(),
                            lastLocalSeq: 0,
                            sentIDs: new Set(),
                            sentFiles: new Set(),
                        }));
                        await this.resetRemoteBucket();
                        Logger(`リモートサーバー上のすべてのデータを削除しました`, LOG_LEVEL_NOTICE);
                    })
            )
            .addOnUpdate(this.onlyOnMinIO);
    });

    void addPanel(paneEl, "リセット").then((paneEl) => {
        new Setting(paneEl)
            .setName("Self-hosted LiveSync のリセットまたはアンインストールのため、ローカルデータベースを削除")
            .addButton((button) =>
                button
                    .setButtonText("削除")
                    .setWarning()
                    .setDisabled(false)
                    .onClick(async () => {
                        await this.services.database.resetDatabase();
                        await this.services.databaseEvents.initialiseDatabase();
                    })
            );
    });
}
