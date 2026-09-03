export {
    AllSettingDefault,
    OnDialogSettingsDefault,
    SettingInformation,
} from "@vrtmrz/livesync-commonlib/compat/common/settingConstants";
export type {
    AllSettings,
    AllSettingItemKey,
    AllStringItemKey,
    AllNumericItemKey,
    AllBooleanItemKey,
    OnDialogSettings,
    ValueOf,
} from "@vrtmrz/livesync-commonlib/compat/common/settingConstants";

import {
    getConfig as getCommonlibConfig,
    getConfName as getCommonlibConfName,
    type AllSettingItemKey,
} from "@vrtmrz/livesync-commonlib/compat/common/settingConstants";
import type { MessageTranslator } from "@vrtmrz/livesync-commonlib/context";
import { currentLang, translateLiveSyncMessage } from "@/common/translation";

// These labels are written directly in upstream's settings implementation rather
// than being message-catalogue keys. Keep their Japanese wording in source: when
// upstream assigns a catalogue key, this entry must be removed in favour of it.
const unkeyedJapaneseSettingsText: Readonly<Record<string, string>> = {
    "Sync Mode": "同期モード",
    "Server URI": "サーバー URI",
    Username: "ユーザー名",
    Password: "パスワード",
    "Database Name": "データベース名",
    Passphrase: "パスフレーズ",
    "Encryption passphrase. If changed, you should overwrite the server's database with the new (encrypted) files.":
        "暗号化用のパスフレーズです。変更した場合は、新しい（暗号化済みの）ファイルでサーバーのデータベースを上書きしてください。",
    "Display Language": "表示言語",
    'Not all messages have been translated. And, please revert to "Default" when reporting errors.':
        "すべてのメッセージが翻訳されているわけではありません。問題を報告する際は「既定」に戻してください。",
    "Show status inside the editor": "エディター内に状態を表示",
    "Requires restart of Obsidian.": "Obsidian の再起動が必要です。",
    "Show status as icons only": "状態をアイコンだけで表示",
    "Show status on the status bar": "ステータスバーに状態を表示",
    "Show status icon instead of file warnings banner": "ファイル警告バナーの代わりに状態アイコンを表示",
    "If enabled, the ⛔ icon will be shown inside the status instead of the file warnings banner. No details will be shown.":
        "有効にすると、ファイル警告バナーの代わりに状態内へ ⛔ アイコンを表示します。詳細は表示されません。",
    "Network warning style": "ネットワーク警告の表示方法",
    "How to display network errors when the sync server is unreachable.":
        "同期サーバーに接続できない場合のネットワークエラー表示方法です。",
    "Show full banner": "バナーをすべて表示",
    "Show icon only": "アイコンのみ表示",
    "Hide completely": "完全に非表示",
    "Show only notifications": "通知のみ表示",
    "Disables logging, only shows notifications. Please disable if you report an issue.":
        "ログを無効にして通知だけを表示します。問題を報告する場合は無効にしてください。",
    "Verbose Log": "詳細ログ",
    "Show verbose log. Please enable if you report an issue.": "詳細ログを表示します。問題を報告する場合は有効にしてください。",
    "Enable advanced features": "高度な機能を有効化",
    "Enable poweruser features": "パワーユーザー向け機能を有効化",
    "Enable edge case treatment features": "例外的な状況向け機能を有効化",
    "Keep replication active in the background": "バックグラウンドで同期を維持",
    "Desktop only; uses more battery and network.": "デスクトップのみ。バッテリーとネットワークをより多く使用します。",
    "Allow sleep during synchronisation": "同期中のスリープを許可",
    "Allow the operating system to sleep while finite synchronisation operations are in progress.":
        "有限の同期処理の実行中に、オペレーティングシステムのスリープを許可します。",
    "Allow sleep during synchronisation on the desktop": "デスクトップで同期中のスリープを許可",
    "Desktop only. Allow sleep on this device even when the general option is disabled.":
        "デスクトップのみ。全般の設定が無効でも、このデバイスでのスリープを許可します。",
    "Memory cache": "メモリーキャッシュ",
    "Memory cache size (by total items)": "メモリーキャッシュのサイズ（項目数）",
    "Local Database Tweak": "ローカルデータベースの調整",
    "Chunk Splitter": "チャンク分割方式",
    "Now we can choose how to split the chunks; V3 is the most efficient. If you have troubled, please make this Default or Legacy.":
        "チャンクの分割方式を選べます。V3 が最も効率的です。問題が起きる場合は「既定」または「Legacy」にしてください。",
    "Enhance chunk size": "チャンクサイズを拡張",
    "Transfer Tweak": "転送の調整",
    "Fetch chunks on demand": "必要に応じてチャンクを取得",
    "(ex. Read chunks online) If this option is enabled, LiveSync reads chunks online directly instead of replicating them locally. Increasing Custom chunk size is recommended.":
        "有効にすると、LiveSync はチャンクをローカルへ複製せず必要に応じてオンラインから直接読み込みます。カスタムチャンクサイズを大きくすることを推奨します。",
    "Batch size of on-demand fetching": "オンデマンド取得のバッチサイズ",
    "The delay for consecutive on-demand fetches": "連続したオンデマンド取得の間隔",
    "Use Only Local Chunks": "ローカルのチャンクだけを使用",
    "If enabled, the plugin will not attempt to connect to the remote database even if the chunk was not found locally.":
        "有効にすると、ローカルでチャンクが見つからない場合でも、プラグインはリモートデータベースへ接続しません。",
    "Auto-accept compatible tweak mismatches": "互換性のある調整値の不一致を自動承認",
    "Automatically accepts mismatches that are compatible but potentially lossy by comparing tweak modification times.":
        "調整値の更新時刻を比較し、互換性はあるものの情報を失う可能性がある不一致を自動承認します。",
    "Remote Database Tweak": "リモートデータベースの調整",
    "Enable compression": "圧縮を有効化",
    "Data Compression": "データ圧縮",
    "xxhash64 is the current default.": "xxhash64 が現在の既定値です。",
    Selector: "選択ルール",
    "Customisation sync": "カスタマイズ同期",
    "Enable per-file customization sync": "ファイル単位のカスタマイズ同期を有効にする",
    "If enabled, efficient per-file customization sync will be used. A minor migration is required when enabling this feature, and all devices must be updated to v0.23.18. Enabling this feature will result in losing compatibility with older versions.":
        "有効にすると、効率的なファイル単位のカスタマイズ同期を使用します。有効化時には小規模な移行が必要で、すべてのデバイスを v0.23.18 以降へ更新する必要があります。有効にすると、古いバージョンとの互換性は失われます。",
    Hatch: "緊急対応",
    Advanced: "高度な設定",
    "Power users": "パワーユーザー",
    Patches: "互換性・例外",
    Maintenance: "メンテナンス",
    "Normal Files": "通常ファイル",
    "Synchronising files": "同期するファイル",
    "(RegExp) Empty to sync all files. Set filter as a regular expression to limit synchronising files.":
        "（正規表現）空欄ならすべてのファイルを同期します。同期対象を絞るには正規表現でフィルターを指定してください。",
    "Non-Synchronising files": "同期しないファイル",
    "(RegExp) If this is set, any changes to local and remote files that match this will be skipped.":
        "（正規表現）指定すると、これに一致するローカルおよびリモートのファイル変更をスキップします。",
    "Hidden Files": "隠しファイル",
    "Target patterns": "対象パターン",
    "Patterns to match files for syncing": "同期対象のファイルに一致させるパターンです。",
    "Ignore patterns": "除外パターン",
    "Add default patterns": "既定パターンを追加",
    Default: "既定",
    "Cross-platform": "クロスプラットフォーム",
    "Overwrite patterns": "上書きパターン",
    "Patterns to match files for overwriting instead of merging": "マージではなく上書きするファイルに一致させるパターンです。",
    "CouchDB Connection Tweak": "CouchDB 接続の調整",
    "If you reached the payload size limit when using IBM Cloudant, please decrease batch size and batch limit to a lower value.":
        "IBM Cloudant でペイロードサイズの上限に達した場合は、バッチサイズとバッチ上限を小さくしてください。",
    "Configuration Encryption": "設定の暗号化",
    "Encrypting sensitive configuration items": "機微な設定項目を暗号化",
    "Passphrase of sensitive configuration items": "機微な設定項目のパスフレーズ",
    "This passphrase will not be copied to another device. It will be set to `Default` until you configure it again.":
        "このパスフレーズは他のデバイスにはコピーされません。再設定するまで「既定」に設定されます。",
    "Use a custom passphrase": "カスタムパスフレーズを使用",
    "Ask an passphrase at every launch": "起動のたびにパスフレーズを尋ねる",
    Developer: "開発者向け",
    "Enable Developers' Debug Tools (If available).": "開発者向けデバッグツールを有効にする（利用可能な場合）",
    "While enabled, it causes very performance impact but debugging replication testing and other features will be enabled. Please disable this if you have not read the source code. Requires restart of Obsidian. Sometimes there is no implementation.":
        "有効にすると性能への影響は大きくなりますが、レプリケーションテスト用のデバッグ機能などを利用できます。ソースコードを確認していない場合は有効にしないでください。Obsidian の再起動が必要です。実装されていない場合もあります。",
    "E2EE Configuration": "エンドツーエンド暗号化の設定",
    "Configure E2EE": "エンドツーエンド暗号化を設定",
    Configure: "設定",
    "Configure And Change Remote": "設定してリモートを変更",
    "Scram!": "緊急停止",
    "Scram Switches": "緊急停止スイッチ",
    "Scan for Broken files": "破損ファイルをスキャン",
    "Recovery and Repair": "復旧と修復",
    "Resolve All conflicted files by the newer one": "すべての競合ファイルを新しい方で解決",
    "Resolve all conflicted files by the newer one. Caution: This will overwrite the older one, and cannot resurrect the overwritten one.":
        "すべての競合ファイルを新しい方で解決します。注意: 古い方は上書きされ、復元できません。",
    "Resolve All": "すべて解決",
    "Check and convert non-path-obfuscated files": "パス難読化されていないファイルを確認して変換",
    Perform: "実行",
    Reset: "リセット",
    "Back to non-configured": "未設定の状態に戻す",
    Back: "戻す",
    "Delete all customization sync data": "カスタマイズ同期データをすべて削除",
    Delete: "削除",
    "Compatibility (Metadata)": "互換性（メタデータ）",
    "Compatibility (Conflict Behaviour)": "互換性（競合時の動作）",
    "Compatibility (Database structure)": "互換性（データベース構造）",
    "Compatibility (Internal API Usage)": "互換性（内部 API の使用）",
    "Compatibility (Remote Database)": "互換性（リモートデータベース）",
    "Compatibility (Trouble addressed)": "互換性（問題対策済み）",
    "Edge case addressing (Database)": "例外的な状況への対応（データベース）",
    "Edge case addressing (Behaviour)": "例外的な状況への対応（動作）",
    "Edge case addressing (Processing)": "例外的な状況への対応（処理）",
    Remediation: "対処",
    "End-to-End Encryption Algorithm": "エンドツーエンド暗号化アルゴリズム",
    "Please use V2, V1 is deprecated and will be removed in the future, It was not a very appropriate algorithm. Only for compatibility V1 is kept.":
        "V2 を使用してください。V1 は非推奨で、将来削除されます。適切なアルゴリズムではなかったため、互換性のためだけに V1 を残しています。",
    "Process files even if seems to be corrupted": "破損しているように見えるファイルも処理する",
    "You can enable this setting to process the files with size mismatches, these files can be created by some APIs or integrations.":
        "この設定を有効にすると、サイズが一致しないファイルも処理します。このようなファイルは、一部の API や統合によって作成されることがあります。",
    "Maximum file modification time for reflected file events": "反映するファイルイベントの最大更新時刻",
    "Files with modification times greater than this value (in seconds since the Unix epoch) will not have their events reflected. Set to 0 to disable this limit.":
        "更新時刻がこの値（Unix エポックからの秒数）より大きいファイルは、そのイベントを反映しません。0 に設定するとこの上限を無効にします。",
    "Database Adapter": "データベースアダプター",
    "Select the database adapter to use. ": "使用するデータベースアダプターを選択します。",
    "Switch to IndexedDB": "IndexedDB に切り替え",
    "Switch to IDB": "IDB に切り替え",
    "Old Algorithm": "旧アルゴリズム",
    "xxhash32 (Fast but less collision resistance)": "xxhash32（高速、衝突耐性は低め）",
    "xxhash64 (Fastest)": "xxhash64（最速）",
    "PureJS fallback  (Fast, W/O WebAssembly)": "PureJS フォールバック（高速、WebAssembly なし）",
    "Older fallback (Slow, W/O WebAssembly)": "旧フォールバック（低速、WebAssembly なし）",
    "The IndexedDB adapter often offers superior performance in certain scenarios, but it has been found to cause memory leaks when used with LiveSync mode. When using LiveSync mode, please use IDB adapter instead.":
        "IndexedDB アダプターは状況によって高い性能を発揮しますが、LiveSync モードで使うとメモリーリークが起きることが確認されています。LiveSync モードでは IDB アダプターを使用してください。",
    "Changing this setting requires migrating existing data (a bit time may be taken) and restarting Obsidian. Please make sure to back up your data before proceeding.":
        "この設定を変更するには既存データの移行（時間がかかる場合があります）と Obsidian の再起動が必要です。続行する前に必ずデータをバックアップしてください。",
    "Lock Server": "サーバーをロック",
    "Lock the remote server to prevent synchronization with other devices.": "他のデバイスとの同期を防ぐため、リモートサーバーをロックします。",
    Lock: "ロック",
    "Emergency restart": "緊急再起動",
    "Disables all synchronization and restart.": "すべての同期を無効にして再起動します。",
    "Flag and restart": "フラグを設定して再起動",
    "Reset Synchronisation information": "同期情報をリセット",
    "Reset Synchronisation on This Device": "このデバイスの同期をリセット",
    "Restore or reconstruct local database from remote.": "リモートからローカルデータベースを復元または再構築します。",
    "Overwrite Server Data with This Device's Files": "このデバイスのファイルでサーバーデータを上書き",
    "Rebuild local and remote database with local files.": "ローカルファイルからローカルおよびリモートのデータベースを再構築します。",
    "Schedule and Restart": "予約して再起動",
    Syncing: "同期中",
    Resend: "再送信",
    "Resend all chunks to the remote.": "すべてのチャンクをリモートへ再送信します。",
    "Send chunks": "チャンクを送信",
    "Reset journal received history": "ジャーナル受信履歴をリセット",
    "Initialise journal received history. On the next sync, every item except this device sent will be downloaded again.":
        "ジャーナルの受信履歴を初期化します。次回の同期では、このデバイスから送信したもの以外を再ダウンロードします。",
    "Reset received": "受信履歴をリセット",
    "Reset journal sent history": "ジャーナル送信履歴をリセット",
    "Initialise journal sent history. On the next sync, every item except this device received will be sent again.":
        "ジャーナルの送信履歴を初期化します。次回の同期では、このデバイスが受信したもの以外を再送信します。",
    "Reset sent history": "送信履歴をリセット",
    "Garbage Collection V3 (Beta)": "ガベージコレクション V3（ベータ）",
    "Perform Garbage Collection": "ガベージコレクションを実行",
    "Perform Garbage Collection to remove unused chunks and reduce database size.":
        "未使用のチャンクを削除してデータベースサイズを削減するため、ガベージコレクションを実行します。",
    "Rebuilding Operations (Remote Only)": "再構築操作（リモートのみ）",
    "Perform cleanup": "クリーンアップを実行",
    "Reduces storage space by discarding all non-latest revisions. This requires the same amount of free space on the remote server and the local client.":
        "最新以外のすべてのリビジョンを破棄して保存容量を削減します。リモートサーバーとローカルクライアントに同程度の空き容量が必要です。",
    "Overwrite remote": "リモートを上書き",
    "Overwrite remote with local DB and passphrase.": "ローカル DB とパスフレーズでリモートを上書きします。",
    Send: "送信",
    "Reset all journal counter": "すべてのジャーナルカウンターをリセット",
    "Initialise all journal history, On the next sync, every item will be received and sent.":
        "すべてのジャーナル履歴を初期化します。次回の同期では、すべての項目を受信・送信します。",
    "Reset all": "すべてリセット",
    "Purge all journal counter": "すべてのジャーナルカウンターを消去",
    "Purge all download/upload cache.": "すべてのダウンロード／アップロードキャッシュを消去します。",
    "Fresh Start Wipe": "完全消去してやり直す",
    "Delete all data on the remote server.": "リモートサーバー上のすべてのデータを削除します。",
    "Delete local database to reset or uninstall Self-hosted LiveSync":
        "Self-hosted LiveSync をリセットまたはアンインストールするため、ローカルデータベースを削除",
    "I've made a backup, mark this device 'resolved'": "バックアップを作成しました。このデバイスを「解決済み」にする",
    "I'm ready, unlock the database": "準備ができました。データベースのロックを解除",
    "No limit configured": "上限は設定されていません",
    "The remote database is locked for synchronization to prevent vault corruption because this device isn't marked as 'resolved'. Please backup your vault, reset the local database, and select 'Mark this device as resolved'. This warning will persist until the device is confirmed as resolved by replication.":
        "このデバイスが「解決済み」とマークされていないため、Vault の破損を防ぐ目的でリモートデータベースは同期用にロックされています。Vault をバックアップし、ローカルデータベースをリセットしてから「このデバイスを解決済みにする」を選択してください。複製によって解決済みと確認されるまで、この警告は表示され続けます。",
    "To prevent unwanted vault corruption, the remote database has been locked for synchronization. (This device is marked 'resolved') When all your devices are marked 'resolved', unlock the database. This warning kept showing until confirming the device is resolved by the replication":
        "不要な Vault の破損を防ぐため、リモートデータベースは同期用にロックされています（このデバイスは「解決済み」です）。すべてのデバイスが「解決済み」になったら、データベースのロックを解除してください。複製で解決済みと確認されるまで、この警告は表示され続けます。",
};

/** Translate upstream strings that have not been assigned a message-catalogue key yet. */
export function localiseUnkeyedSettingsText(text: string): string {
    if (currentLang !== "ja") return text;
    if (text.startsWith("Current adapter: ")) return `現在のアダプター: ${text.slice("Current adapter: ".length)}`;
    if (text.startsWith("Limit: ")) return `上限: ${text.slice("Limit: ".length)}`;
    return unkeyedJapaneseSettingsText[text] ?? text;
}

// Commonlib defaults `translate` to its English-only translator, so every caller which omits
// it silently renders English regardless of `displayLanguage`. Default it to the LiveSync
// catalogue instead, and re-export these wrappers under the original names so that no call
// site has to remember the second argument.

/** `getConfig` with the LiveSync catalogue applied by default. */
export function getConfig(key: AllSettingItemKey, translate: MessageTranslator = translateLiveSyncMessage) {
    return getCommonlibConfig(key, (text, variables) => localiseUnkeyedSettingsText(translate(text, variables)));
}

/** `getConfName` with the LiveSync catalogue applied by default. See `getConfig`. */
export function getConfName(key: AllSettingItemKey, translate: MessageTranslator = translateLiveSyncMessage) {
    return getCommonlibConfName(key, (text, variables) => localiseUnkeyedSettingsText(translate(text, variables)));
}
