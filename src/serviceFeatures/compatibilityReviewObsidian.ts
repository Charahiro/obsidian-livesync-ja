import { Notice } from "@/deps.ts";
import { $msg } from "@/common/translation";
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
        const reviewDetails = $msg("CompatibilityReview.Action.ReviewDetails");
        const keepPaused = $msg("CompatibilityReview.Action.KeepPaused");
        const resume = $msg("CompatibilityReview.Action.Resume");
        const buttons = !pause.resumable
            ? ([reviewDetails, keepPaused] as const)
            : ([reviewDetails, resume, keepPaused] as const);
        const result = await this.confirm.confirmWithMessage(
            $msg("CompatibilityReview.Title.Summary"),
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
        const back = $msg("CompatibilityReview.Action.Back");
        const result = await this.confirm.confirmWithMessage(
            $msg("CompatibilityReview.Title.Details"),
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
                text: $msg("Self-hosted LiveSync has paused remote synchronisation for compatibility review. "),
            });
            documentFragment.createEl("a", { text: $msg("Review why") }, (anchor) => {
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
