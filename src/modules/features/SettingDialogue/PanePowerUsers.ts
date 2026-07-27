import { type ConfigPassphraseStore } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { LiveSyncSetting as Setting } from "./LiveSyncSetting.ts";
import type { ObsidianLiveSyncSettingTab } from "./ObsidianLiveSyncSettingTab.ts";
import type { PageFunctions } from "./SettingPane.ts";

export function panePowerUsers(
    this: ObsidianLiveSyncSettingTab,
    paneEl: HTMLElement,
    { addPanel }: PageFunctions
): void {
    void addPanel(paneEl, "CouchDB 接続調整", undefined, this.onlyOnCouchDB).then((paneEl) => {
        paneEl.addClass("wizardHidden");

        this.createEl(
            paneEl,
            "div",
            {
                text: `IBM Cloudant の使用時にペイロードサイズの上限に達した場合は、バッチサイズとバッチ上限を小さくしてください。`,
            },
            undefined,
            this.onlyOnCouchDB
        ).addClass("wizardHidden");

        new Setting(paneEl)
            .setClass("wizardHidden")
            .autoWireNumeric("batch_size", { clampMin: 2, onUpdate: this.onlyOnCouchDB });
        new Setting(paneEl).setClass("wizardHidden").autoWireNumeric("batches_limit", {
            clampMin: 2,
            onUpdate: this.onlyOnCouchDB,
        });
        new Setting(paneEl).setClass("wizardHidden").autoWireToggle("useTimeouts", { onUpdate: this.onlyOnCouchDB });
    });
    void addPanel(paneEl, "設定の暗号化").then((paneEl) => {
        const passphrase_options: Record<ConfigPassphraseStore, string> = {
            "": "既定",
            LOCALSTORAGE: "カスタムパスフレーズを使用",
            ASK_AT_LAUNCH: "起動ごとにパスフレーズを確認",
        };

        new Setting(paneEl)
            .setName("機密性の高い設定項目を暗号化")
            .autoWireDropDown("configPassphraseStore", {
                options: passphrase_options,
                holdValue: true,
            })
            .setClass("wizardHidden");

        new Setting(paneEl)
            .autoWireText("configPassphrase", { isPassword: true, holdValue: true })
            .setClass("wizardHidden")
            .addOnUpdate(() => ({
                disabled: !this.isConfiguredAs("configPassphraseStore", "LOCALSTORAGE"),
            }));
        new Setting(paneEl).addApplyButton(["configPassphrase", "configPassphraseStore"]).setClass("wizardHidden");
    });
    void addPanel(paneEl, "開発者").then((paneEl) => {
        new Setting(paneEl).autoWireToggle("enableDebugTools").setClass("wizardHidden");
    });
}
