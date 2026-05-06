import {
    E2EEAlgorithmNames,
    E2EEAlgorithms,
    type HashAlgorithm,
    LOG_LEVEL_NOTICE,
    SuffixDatabaseName,
} from "../../../lib/src/common/types.ts";
import { Logger } from "../../../lib/src/common/logger.ts";
import { LiveSyncSetting as Setting } from "./LiveSyncSetting.ts";
import type { ObsidianLiveSyncSettingTab } from "./ObsidianLiveSyncSettingTab.ts";
import type { PageFunctions } from "./SettingPane.ts";
import { visibleOnly } from "./SettingPane.ts";
import { PouchDB } from "../../../lib/src/pouchdb/pouchdb-browser";
import { ExtraSuffixIndexedDB } from "../../../lib/src/common/types.ts";
import { migrateDatabases } from "./settingUtils.ts";

export function panePatches(this: ObsidianLiveSyncSettingTab, paneEl: HTMLElement, { addPanel }: PageFunctions): void {
    void addPanel(paneEl, "互換性 (メタデータ)").then((paneEl) => {
        new Setting(paneEl).setClass("wizardHidden").autoWireToggle("deleteMetadataOfDeletedFiles");

        new Setting(paneEl).setClass("wizardHidden").autoWireNumeric("automaticallyDeleteMetadataOfDeletedFiles", {
            onUpdate: visibleOnly(() => this.isConfiguredAs("deleteMetadataOfDeletedFiles", true)),
        });
    });

    void addPanel(paneEl, "互換性 (競合時の動作)").then((paneEl) => {
        paneEl.addClass("wizardHidden");
        new Setting(paneEl).setClass("wizardHidden").autoWireToggle("disableMarkdownAutoMerge");
        new Setting(paneEl).setClass("wizardHidden").autoWireToggle("writeDocumentsIfConflicted");
    });

    void addPanel(paneEl, "互換性 (データベース構造)").then((paneEl) => {
        const migrateAllToIndexedDB = async () => {
            const dbToName = this.core.localDatabase.dbname + SuffixDatabaseName + ExtraSuffixIndexedDB;
            const options = {
                adapter: "indexeddb",
                //@ts-ignore :missing def
                purged_infos_limit: 1,
                auto_compaction: false,
                deterministic_revs: true,
            };
            const openTo = () => {
                return new PouchDB(dbToName, options);
            };
            if (await migrateDatabases("to IndexedDB", this.core.localDatabase.localDatabase, openTo)) {
                Logger(
                    "Migration to IndexedDB completed. Obsidian will be restarted with new configuration immediately.",
                    LOG_LEVEL_NOTICE
                );
                // this.plugin.settings.useIndexedDBAdapter = true;
                // await this.services.setting.saveSettingData();
                await this.core.services.setting.applyPartial({ useIndexedDBAdapter: true }, true);
                this.services.appLifecycle.performRestart();
            }
        };
        const migrateAllToIDB = async () => {
            const dbToName = this.core.localDatabase.dbname + SuffixDatabaseName;
            const options = {
                adapter: "idb",
                auto_compaction: false,
                deterministic_revs: true,
            };
            const openTo = () => {
                return new PouchDB(dbToName, options);
            };
            if (await migrateDatabases("to IDB", this.core.localDatabase.localDatabase, openTo)) {
                Logger(
                    "Migration to IDB completed. Obsidian will be restarted with new configuration immediately.",
                    LOG_LEVEL_NOTICE
                );
                await this.core.services.setting.applyPartial({ useIndexedDBAdapter: false }, true);
                // this.core.settings.useIndexedDBAdapter = false;
                // await this.services.setting.saveSettingData();
                this.services.appLifecycle.performRestart();
            }
        };
        {
            const infoClass = this.editingSettings.useIndexedDBAdapter ? "op-warn" : "op-warn-info";
            paneEl.createDiv({
                text: "IndexedDB アダプターは一部の状況で高い性能を発揮しますが、LiveSync モードで使用するとメモリリークが発生することが分かっています。LiveSync モードでは、代わりに IDB アダプターを使用してください。",
                cls: infoClass,
            });
            paneEl.createDiv({
                text: "この設定を変更するには、既存データの移行と Obsidian の再起動が必要です。時間がかかる場合があります。続行する前に必ずデータをバックアップしてください。",
                cls: "op-warn-info",
            });
            const setting = new Setting(paneEl)
                .setName("データベースアダプター")
                .setDesc("使用するデータベースアダプターを選択します。");
            const el = setting.controlEl.createDiv({});
            el.setText(`現在のアダプター: ${this.editingSettings.useIndexedDBAdapter ? "IndexedDB" : "IDB"}`);
            if (!this.editingSettings.useIndexedDBAdapter) {
                setting.addButton((button) => {
                    button.setButtonText("IndexedDB に切り替え").onClick(async () => {
                        Logger("Migrating all data to IndexedDB...", LOG_LEVEL_NOTICE);
                        await migrateAllToIndexedDB();
                        Logger(
                            "Migration to IndexedDB completed. Please switch the adapter and restart Obsidian.",
                            LOG_LEVEL_NOTICE
                        );
                    });
                });
            } else {
                setting.addButton((button) => {
                    button.setButtonText("IDB に切り替え").onClick(async () => {
                        Logger("Migrating all data to IDB...", LOG_LEVEL_NOTICE);
                        await migrateAllToIDB();
                        Logger(
                            "Migration to IDB completed. Please switch the adapter and restart Obsidian.",
                            LOG_LEVEL_NOTICE
                        );
                    });
                });
            }
        }
        new Setting(paneEl).autoWireToggle("handleFilenameCaseSensitive", { holdValue: true }).setClass("wizardHidden");
    });

    void addPanel(paneEl, "互換性 (内部 API の使用)").then((paneEl) => {
        new Setting(paneEl).autoWireToggle("watchInternalFileChanges", { invert: true });
    });
    void addPanel(paneEl, "互換性 (リモートデータベース)").then((paneEl) => {
        new Setting(paneEl).autoWireDropDown("E2EEAlgorithm", {
            options: E2EEAlgorithmNames,
        });
    });
    new Setting(paneEl).autoWireToggle("useDynamicIterationCount", {
        holdValue: true,
        onUpdate: visibleOnly(
            () =>
                this.isConfiguredAs("E2EEAlgorithm", E2EEAlgorithms.ForceV1) ||
                this.isConfiguredAs("E2EEAlgorithm", E2EEAlgorithms.V1)
        ),
    });

    void addPanel(paneEl, "特殊ケース対応 (データベース)").then((paneEl) => {
        new Setting(paneEl)
            .autoWireText("additionalSuffixOfDatabaseName", { holdValue: true })
            .addApplyButton(["additionalSuffixOfDatabaseName"]);

        this.addOnSaved("additionalSuffixOfDatabaseName", async (key) => {
            Logger("Suffix has been changed. Reopening database...", LOG_LEVEL_NOTICE);
            await this.services.databaseEvents.initialiseDatabase();
        });

        new Setting(paneEl).autoWireDropDown("hashAlg", {
            options: {
                "": "旧アルゴリズム",
                xxhash32: "xxhash32 (高速、衝突耐性はやや低い)",
                xxhash64: "xxhash64 (最速)",
                "mixed-purejs": "PureJS フォールバック (高速、WebAssembly なし)",
                sha1: "旧フォールバック (低速、WebAssembly なし)",
            } as Record<HashAlgorithm, string>,
        });
        this.addOnSaved("hashAlg", async () => {
            await this.core.localDatabase._prepareHashFunctions();
        });
    });
    void addPanel(paneEl, "特殊ケース対応 (動作)").then((paneEl) => {
        new Setting(paneEl).autoWireToggle("doNotSuspendOnFetching");
        new Setting(paneEl).setClass("wizardHidden").autoWireToggle("doNotDeleteFolder");
        new Setting(paneEl).autoWireToggle("processSizeMismatchedFiles");
    });

    void addPanel(paneEl, "特殊ケース対応 (処理)").then((paneEl) => {
        new Setting(paneEl).autoWireToggle("disableWorkerForGeneratingChunks");

        new Setting(paneEl).autoWireToggle("processSmallFilesInUIThread", {
            onUpdate: visibleOnly(() => this.isConfiguredAs("disableWorkerForGeneratingChunks", false)),
        });
    });
    // void addPanel(paneEl, "Edge case addressing (Networking)").then((paneEl) => {
    // new Setting(paneEl).autoWireToggle("useRequestAPI");
    // });
    void addPanel(paneEl, "互換性 (問題回避)").then((paneEl) => {
        new Setting(paneEl).autoWireToggle("disableCheckingConfigMismatch");
    });
    void addPanel(paneEl, "修復補助").then((paneEl) => {
        let dateEl: HTMLSpanElement;
        new Setting(paneEl)
            .addText((text) => {
                const updateDateText = () => {
                    if (this.editingSettings.maxMTimeForReflectEvents == 0) {
                        dateEl.textContent = `制限は設定されていません`;
                    } else {
                        const date = new Date(this.editingSettings.maxMTimeForReflectEvents);
                        dateEl.textContent = `制限: ${date.toLocaleString()} (${this.editingSettings.maxMTimeForReflectEvents})`;
                    }
                    this.requestUpdate();
                };
                text.inputEl.before((dateEl = document.createElement("span")));
                text.inputEl.type = "datetime-local";
                if (this.editingSettings.maxMTimeForReflectEvents > 0) {
                    const date = new Date(this.editingSettings.maxMTimeForReflectEvents);
                    const isoString = date.toISOString().slice(0, 16);
                    text.setValue(isoString);
                } else {
                    text.setValue("");
                }
                text.onChange((value) => {
                    if (value == "") {
                        this.editingSettings.maxMTimeForReflectEvents = 0;
                        updateDateText();
                        return;
                    }
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        this.editingSettings.maxMTimeForReflectEvents = date.getTime();
                    }
                    updateDateText();
                });
                updateDateText();
                return text;
            })
            .setAuto("maxMTimeForReflectEvents")
            .addApplyButton(["maxMTimeForReflectEvents"]);

        this.addOnSaved("maxMTimeForReflectEvents", async (key) => {
            const buttons = ["今すぐ再起動", "あとで"] as const;
            const reboot = await this.core.confirm.askSelectStringDialogue(
                "Obsidian の再起動を強く推奨します。再起動するまで、一部の変更が反映されず表示が不整合になる場合があります。今すぐ再起動しますか？",
                buttons,
                {
                    title: "修復補助設定が変更されました",
                    defaultAction: "今すぐ再起動",
                }
            );
            if (reboot !== "あとで") {
                Logger("Remediation setting changed. Restarting Obsidian...", LOG_LEVEL_NOTICE);
                this.services.appLifecycle.performRestart();
            }
        });
    });
    void addPanel(paneEl, "リモートデータベース調整 (廃止予定)").then((paneEl) => {
        // new Setting(paneEl).autoWireToggle("useEden").setClass("wizardHidden");
        // const onlyUsingEden = visibleOnly(() => this.isConfiguredAs("useEden", true));
        // new Setting(paneEl).autoWireNumeric("maxChunksInEden", { onUpdate: onlyUsingEden }).setClass("wizardHidden");
        // new Setting(paneEl)
        //     .autoWireNumeric("maxTotalLengthInEden", { onUpdate: onlyUsingEden })
        //     .setClass("wizardHidden");
        // new Setting(paneEl).autoWireNumeric("maxAgeInEden", { onUpdate: onlyUsingEden }).setClass("wizardHidden");

        new Setting(paneEl).autoWireToggle("enableCompression").setClass("wizardHidden");
    });
}
