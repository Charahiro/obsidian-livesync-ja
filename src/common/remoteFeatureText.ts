import { describeRemoteFeatureRejection } from "@vrtmrz/livesync-commonlib/replication";
import { uiText } from "./uiText";

/** Localise the upstream diagnostic at the user-facing notice boundary. */
export function remoteFeatureRejectionText(assessment: Parameters<typeof describeRemoteFeatureRejection>[0]): string {
    switch (assessment.status) {
        case "unknown-features":
            return uiText(
                "Unknown features are in use: {features}",
                "未対応の機能が使用されています：{features}"
            ).replace("{features}", assessment.identifiers.join(", "));
        case "unsupported-generation":
            return uiText(
                "Unsupported remote database generation: {version}",
                "未対応のリモートデータベース世代：{version}"
            ).replace("{version}", String(assessment.version));
        case "invalid-control":
            return uiText(
                "The remote database version document is invalid.",
                "リモートデータベースのバージョンドキュメントが不正です。"
            );
        default:
            return describeRemoteFeatureRejection(assessment);
    }
}
