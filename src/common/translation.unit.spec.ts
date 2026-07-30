import { afterEach, describe, expect, it } from "vitest";

import { $msg, setLang, translateLiveSyncMessage } from "@/common/translation";
import { SUPPORTED_I18N_LANGS } from "@/common/rosetta";
import { liveSyncProvisionalEnglishMessages } from "@/common/messages/LiveSyncProvisionalMessages";

describe("LiveSync-owned translation catalogue", () => {
    afterEach(() => setLang("def"));

    it("selects a translated language without delegating catalogue ownership to Commonlib", () => {
        setLang("es");

        expect(translateLiveSyncMessage("moduleCheckRemoteSize.optionIncreaseLimit", { newMax: "800" })).toBe(
            "aumentar a 800MB"
        );
        expect(SUPPORTED_I18N_LANGS).toContain("es");
    });

    it("retains typed placeholder substitution", () => {
        expect($msg("moduleCheckRemoteSize.optionIncreaseLimit", { newMax: "800" }, "def")).toBe("increase to 800MB");
    });

    it("uses the application catalogue for translated Commonlib messages", () => {
        setLang("ja");

        expect(translateLiveSyncMessage("Active Remote Type")).toBe("現在のリモート種別");
        expect(translateLiveSyncMessage("Signalling Relays")).toBe("シグナリングリレー");
    });

    it("expands the language dialogue keywords in Japanese", () => {
        setLang("ja");

        expect($msg("dialog.yourLanguageAvailable")).toContain("インターフェースの表示言語を有効にしました");
        expect($msg("dialog.yourLanguageAvailable")).not.toContain("%{");
        expect($msg("dialog.yourLanguageAvailable.btnRevertToDefault")).toBe("表示言語を既定に戻す");
    });

    it("translates repair, patch, and conflict-resolution messages into Japanese", () => {
        setLang("ja");

        expect($msg("Ui.Settings.Hatch.RecoveryAndRepair")).toBe("復旧と修復");
        expect($msg("Ui.Settings.Patches.CompatibilityMetadata")).toBe("互換性（メタデータ）");
        expect($msg("Remote Database Tweak (In sunset)")).toBe("リモートデータベースの調整 (廃止予定)");
        expect($msg("ConflictResolver.Progress", { current: "10", total: "12" })).toBe(
            "確認・処理中: 10 / 12"
        );
        expect($msg("ConflictResolver.Done")).toBe("完了しました");
    });

    it("uses LiveSync-owned provisional English without extending Commonlib's message contract", () => {
        expect($msg("This file has unresolved conflicts.")).toBe("This file has unresolved conflicts.");
        expect($msg("More actions for ${DEVICE}", { DEVICE: "phone" })).toBe("More actions for phone");
        expect($msg("Connection settings")).toBe("Connection settings");
        expect($msg("Saved connections")).toBe("Saved connections");
        expect(
            $msg("This file has ${COUNT} unresolved versions. They will be reviewed one pair at a time.", {
                COUNT: "3",
            })
        ).toBe("This file has 3 unresolved versions. They will be reviewed one pair at a time.");
        expect(translateLiveSyncMessage("This file has unresolved conflicts.")).toBe(
            "This file has unresolved conflicts."
        );
    });

    it("keeps the additional-device P2P Fetch explanation in the LiveSync-owned provisional catalogue", () => {
        expect(liveSyncProvisionalEnglishMessages).toMatchObject({
            "Setup Complete: Preparing to Fetch from Another Device":
                "Setup Complete: Preparing to Fetch from Another Device",
            "The P2P connection has been configured successfully. The initial synchronisation data must now be fetched from an online source device.":
                "The P2P connection has been configured successfully. The initial synchronisation data must now be fetched from an online source device.",
            "After restarting, select an online source device for the initial Fetch. The local LiveSync database on this device will be rebuilt from that source. Unsynchronised files in this Vault may conflict with the fetched data.":
                "After restarting, select an online source device for the initial Fetch. The local LiveSync database on this device will be rebuilt from that source. Unsynchronised files in this Vault may conflict with the fetched data.",
            "Restart this device, then choose the source device when P2P Rebuild opens.":
                "Restart this device, then choose the source device when P2P Rebuild opens.",
            "Restart and Select Source Device": "Restart and Select Source Device",
            "P2P Status pane": "P2P Status pane",
        });
    });
});
