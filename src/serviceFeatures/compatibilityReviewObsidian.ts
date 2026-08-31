import { Notice } from "@/deps.ts";
import type { Confirm } from "@vrtmrz/livesync-commonlib/compat/interfaces/Confirm";
import type { CompatibilityPause } from "@/common/databaseCompatibility.ts";
import type {
    CompatibilityReviewDetailsAction,
    CompatibilityReviewSummaryAction,
    CompatibilityReviewUi,
} from "./compatibilityReview.ts";
import {
    compatibilityReviewDetailsMarkdown,
    compatibilityReviewSummaryMarkdown,
} from "./compatibilityReviewMarkdown.ts";

export class ObsidianCompatibilityReviewUi implements CompatibilityReviewUi {
    private reminder: Notice | undefined;

    constructor(private readonly confirm: Confirm) {}

    async showSummary(pause: CompatibilityPause): Promise<CompatibilityReviewSummaryAction> {
        const reviewDetails = `互換性の詳細を確認`;
        const keepPaused = `同期を一時停止したままにする`;
        const resume = `同期を再開`;
        const buttons = !pause.resumable
            ? ([reviewDetails, keepPaused] as const)
            : ([reviewDetails, resume, keepPaused] as const);
        const result = await this.confirm.confirmWithMessage(
            `互換性レビューのため同期を一時停止`,
            compatibilityReviewSummaryMarkdown(pause),
            [...buttons],
            keepPaused,
            undefined,
            "vertical"
        );
        if (result === reviewDetails) return "details";
        if (result === resume) return "resume";
        if (result === keepPaused) return "keep-paused";
        return false;
    }

    async showDetails(pause: CompatibilityPause): Promise<CompatibilityReviewDetailsAction> {
        const back = `互換性レビューへ戻る`;
        const result = await this.confirm.confirmWithMessage(
            `互換性レビューの詳細`,
            compatibilityReviewDetailsMarkdown(pause),
            [back],
            back,
            undefined,
            "vertical"
        );
        if (result === back) return "back";
        return false;
    }

    showReminder(openReview: () => void): void {
        this.clearReminder();
        let reminderAnchor: HTMLAnchorElement | undefined;
        const fragment = createFragment((documentFragment) => {
            documentFragment.createSpan({
                text: `互換性を確認するため、Self-hosted LiveSyncはリモート同期を一時停止しました。`,
            });
            documentFragment.createEl("a", { text: `理由を確認` }, (anchor) => {
                reminderAnchor = anchor;
                anchor.addEventListener("click", (event) => {
                    event.preventDefault();
                    openReview();
                });
            });
        });
        this.reminder = new Notice(fragment, 0);
        reminderAnchor?.closest<HTMLElement>(".notice")?.classList.add("livesync-compatibility-review-notice");
    }

    clearReminder(): void {
        this.reminder?.hide();
        this.reminder = undefined;
    }
}

export function createObsidianCompatibilityReviewUi(confirm: Confirm): CompatibilityReviewUi {
    return new ObsidianCompatibilityReviewUi(confirm);
}
