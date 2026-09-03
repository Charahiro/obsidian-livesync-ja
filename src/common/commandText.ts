import { translateIfAvailable } from "./translation.ts";
import { uiTextFromMap } from "./uiText.ts";

/**
 * Japanese counterparts for command names which upstream has not exposed as
 * catalogue messages. Keep this beside the command-registration boundary so
 * Commonlib-owned commands remain untouched and the temporary wording is
 * straightforward to remove when upstream provides keys.
 */
export const unkeyedJapaneseCommandText = {
    "Sync now": "今すぐ同期",
    "Apply pending changes now": "保留中の変更を今すぐ適用",
    "Copy database information for the active file": "アクティブなファイルのデータベース情報をコピー",
    "Show log": "ログを表示",
    "Generate full report for opening the issue with debug info": "デバッグ情報付きで問題報告用の完全レポートを作成",
    "P2P Sync : Connect to the Signalling Server": "P2P同期：シグナリングサーバーに接続",
    "P2P Sync : Disconnect from the Signalling Server": "P2P同期：シグナリングサーバーから切断",
    "Switch active connection": "アクティブな接続を切り替え",
    "Sync with a saved connection": "保存済みの接続で同期",
    "Reset notification threshold and check the remote database usage":
        "通知しきい値をリセットしてリモートデータベース使用量を確認",
    "Show settings as a QR code": "設定をQRコードで表示",
    "Copy settings as a new setup URI": "設定を新しいSetup URIとしてコピー",
    "Copy settings as a new setup URI (With customization sync)":
        "設定を新しいSetup URIとしてコピー（カスタマイズ同期を含む）",
    "Copy settings as a new setup URI (Full)": "設定を新しいSetup URIとしてコピー（すべて）",
    "Create conflict": "競合を作成",
} as const;

/**
 * Resolve an upstream command name after the selected display language is
 * known. Catalogue messages take precedence; this map is only a temporary
 * fallback for upstream literals without a catalogue key.
 */
export function localiseCommandName(english: string): string {
    const catalogueText = translateIfAvailable(english);
    if (catalogueText !== english) return catalogueText;
    return uiTextFromMap(
        english,
        unkeyedJapaneseCommandText[english as keyof typeof unkeyedJapaneseCommandText] ?? english
    );
}
