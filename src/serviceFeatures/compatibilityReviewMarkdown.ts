import type { CompatibilityPause, CompatibilityPauseReason } from "@/common/databaseCompatibility.ts";
import { $msg } from "@/common/translation.ts";

export function compatibilityReviewSummaryMarkdown(pause: CompatibilityPause): string {
    const action = !pause.resumable
        ? $msg("CompatibilityReview.Summary.ActionBlocked")
        : $msg("CompatibilityReview.Summary.ActionResumable");
    return $msg("CompatibilityReview.Summary.Message", { action });
}

function reasonMarkdown(reason: CompatibilityPauseReason): string {
    if (reason.source === "database-version") {
        if (reason.state === "upgrade") {
            return $msg("CompatibilityReview.Reason.DatabaseUpgrade", {
                acknowledgedVersion: `${reason.acknowledgedVersion}`,
                currentVersion: `${reason.currentVersion}`,
            });
        }
        if (reason.state === "downgrade") {
            return $msg("CompatibilityReview.Reason.DatabaseDowngrade", {
                acknowledgedVersion: `${reason.acknowledgedVersion}`,
                currentVersion: `${reason.currentVersion}`,
            });
        }
        if (reason.state === "missing") {
            return $msg("CompatibilityReview.Reason.DatabaseMissing", {
                currentVersion: `${reason.currentVersion}`,
            });
        }
        return $msg("CompatibilityReview.Reason.DatabaseInvalid", {
            currentVersion: `${reason.currentVersion}`,
        });
    }
    if (reason.source === "settings-schema") {
        if (reason.isFromFutureSchema) {
            return $msg("CompatibilityReview.Reason.SettingsFuture", {
                sourceVersion: `${reason.sourceVersion}`,
                currentVersion: `${reason.currentVersion}`,
            });
        }
        return $msg("CompatibilityReview.Reason.SettingsMigrated", {
            sourceVersion: `${reason.sourceVersion}`,
            currentVersion: `${reason.currentVersion}`,
        });
    }
    const escapedMessage = reason.message.replace(/[\\`*_{}[\]()<>#+.!|-]/gu, "\\$&");
    return $msg("CompatibilityReview.Reason.Legacy", { message: escapedMessage });
}

export function compatibilityReviewDetailsMarkdown(pause: CompatibilityPause): string {
    const resolution = !pause.resumable
        ? $msg("CompatibilityReview.Details.ResolutionBlocked")
        : $msg("CompatibilityReview.Details.ResolutionResumable");
    return $msg("CompatibilityReview.Details.Message", {
        reasons: pause.reasons.map(reasonMarkdown).join("\n"),
        resolution,
    });
}
