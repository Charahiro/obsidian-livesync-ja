import type { CompatibilityPause, CompatibilityPauseReason } from "@/common/databaseCompatibility.ts";

export function compatibilityReviewSummaryMarkdown(pause: CompatibilityPause): string {
    const action = !pause.resumable
        ? `検出された状態をこのバージョンで安全に確認済みにすることはできません。再び同期を試す前にSelf-hosted LiveSyncを更新してください。`
        : `再開する前に互換性の詳細を確認し、このリモートデータベースを使用するすべてのデバイスでSelf-hosted LiveSyncを更新してください。`;
    return `互換性の状態を確認する必要があるため、このデバイスではリモート同期を一時停止しています。

${action}

自動同期の設定は変更されていません。このダイアログを閉じても同期は一時停止したままです。`;
}

function reasonMarkdown(reason: CompatibilityPauseReason): string {
    if (reason.source === "database-version") {
        if (reason.state === "upgrade") {
            return `- 最後に確認した内部データベースのバージョンは**${`${reason.acknowledgedVersion}`}**で、このバージョンでは**${`${reason.currentVersion}`}**を使用します。`;
        }
        if (reason.state === "downgrade") {
            return `- このバージョンが使用する内部データベースのバージョンは**${`${reason.currentVersion}`}**ですが、このデバイスでは新しいバージョン**${`${reason.acknowledgedVersion}`}**が以前に確認されています。古いバージョンから同期を再開することはできません。`;
        }
        if (reason.state === "missing") {
            return `- この既存Vaultで、以前に確認した内部データベースのバージョンが見つかりません。Vaultをコピーまたは復元した場合や、新しいObsidianプロファイルで開いた場合に発生します。このバージョンでは**${`${reason.currentVersion}`}**を使用します。ローカルデータベースが空でも、自動的に同期を再開して安全であるとは限りません。`;
        }
        return `- 保存されている内部データベースのバージョン情報が不正です。このバージョンでは**${`${reason.currentVersion}`}**を使用します。`;
    }
    if (reason.source === "settings-schema") {
        if (reason.isFromFutureSchema) {
            return `- 保存済み設定のスキーマは**${`${reason.sourceVersion}`}**で、このバージョンが対応するスキーマ**${`${reason.currentVersion}`}**より新しくなっています。`;
        }
        return `- 設定はスキーマ**${`${reason.sourceVersion}`}**から**${`${reason.currentVersion}`}**へ移行されており、同期を再開する前に確認が必要です。`;
    }
    const escapedMessage = reason.message.replace(/[\\`*_{}[\]()<>#+.!|-]/gu, "\\$&");
    return `- 以前の互換性レビューが保留中です：${escapedMessage}`;
}

export function compatibilityReviewDetailsMarkdown(pause: CompatibilityPause): string {
    const resolution = !pause.resumable
        ? `互換性のある最新バージョンのSelf-hosted LiveSyncをインストールしてください。現在のバージョンでは、この一時停止を解除できません。`
        : `すべてのデバイスを更新した後、互換性レビューの概要へ戻り、同期を明示的に再開してください。その時点で現在の内部バージョンが確認済みとして記録されます。`;
    return `## 同期が一時停止している理由

${pause.reasons.map(reasonMarkdown).join("\n")}

## 一時停止による変更

- リモートレプリケーションは処理開始前に遮断されます。
- 保存済みの自動同期設定は変更されません。
- どちらのダイアログを閉じても安全確認は有効なままです。

## 次に行うこと

${resolution}`;
}
