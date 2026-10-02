import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompatibilityPause } from "@/common/databaseCompatibility.ts";
import {
    compatibilityReviewDetailsMarkdown,
    compatibilityReviewSummaryMarkdown,
} from "./compatibilityReviewMarkdown.ts";
import { ObsidianCompatibilityReviewUi } from "./compatibilityReviewObsidian.ts";
import { setLang } from "@/common/translation.ts";

vi.mock("@/deps.ts", () => ({
    Notice: class {
        hide() {}
    },
}));

const resumablePause: CompatibilityPause = {
    resumable: true,
    reasons: [
        {
            source: "database-version",
            state: "upgrade",
            acknowledgedVersion: 11,
            currentVersion: 12,
            resumable: true,
        },
    ],
};

describe("Obsidian compatibility review", () => {
    afterEach(() => setLang("def"));
    it("explains an invalid device-local acknowledgement", () => {
        const pause: CompatibilityPause = {
            resumable: true,
            reasons: [
                {
                    source: "database-version",
                    state: "invalid",
                    currentVersion: 12,
                    resumable: true,
                },
            ],
        };

        const details = compatibilityReviewDetailsMarkdown(pause);
        expect(details).toContain("保存されている内部データベースのバージョン情報が不正");
        expect(details).toContain("**12**");
    });

    it("offers the generic resume action in a vertical action dialogue", async () => {
        const confirmWithMessage = vi.fn().mockResolvedValue("同期を再開");
        const ui = new ObsidianCompatibilityReviewUi({ confirmWithMessage } as never);

        await expect(ui.showSummary(resumablePause)).resolves.toBe("resume");
        expect(confirmWithMessage).toHaveBeenCalledWith(
            "互換性レビューのため同期を一時停止",
            expect.any(String),
            ["互換性の詳細を確認", "同期を再開", "同期を一時停止したままにする"],
            "同期を一時停止したままにする",
            undefined,
            "vertical"
        );
    });

    it("renders the update compatibility review in Japanese", async () => {
        setLang("ja");
        const confirmWithMessage = vi.fn().mockResolvedValue("同期を再開");
        const ui = new ObsidianCompatibilityReviewUi({ confirmWithMessage } as never);

        expect(compatibilityReviewSummaryMarkdown(resumablePause)).toContain("リモート同期を一時停止");
        expect(compatibilityReviewDetailsMarkdown(resumablePause)).toContain("最後に確認した内部データベース");
        await expect(ui.showSummary(resumablePause)).resolves.toBe("resume");
        expect(confirmWithMessage).toHaveBeenCalledWith(
            "互換性レビューのため同期を一時停止",
            expect.any(String),
            ["互換性の詳細を確認", "同期を再開", "同期を一時停止したままにする"],
            "同期を一時停止したままにする",
            undefined,
            "vertical"
        );
    });
});
