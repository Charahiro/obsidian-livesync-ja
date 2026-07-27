# Self-hosted LiveSync 日本語化フォーク

Self-hosted LiveSync 1.0.0をベースにした日本語化フォークです。

このリリースは、上流1.0.0の新しい構成への移行と、日本語表示の更新を含みます。

## 主な内容

- 上流Self-hosted LiveSync 1.0.0を取り込み
- 翻訳カタログを旧`src/lib`サブモジュールから本体の`src/common/messagesYAML`へ移行
- 1.0.0で追加・変更された日本語辞書を補完
- セットアップ、CouchDB、P2P、競合確認、復旧、設定、コマンド、および通知の日本語表示を更新
- 変更履歴`updates_ja.md`へ1.0.0の内容を追加
- 現行の`docs/troubleshooting.md`に合わせて`docs/troubleshooting_ja.md`を更新
- 新しい復旧手順`docs/recovery_ja.md`を追加
- 翻訳関数の未登録・未翻訳を検出する`npm run i18n:audit-ja`を追加
- BRAT向けの成果物とZIPパッケージをReleaseへ添付

## 1.0.0の主な変更

- 名前付きのCouchDB、オブジェクトストレージ、およびP2P接続に対応
- 初回セットアップと追加デバイスの導線を改善
- 互換性のあるチャンク設定差異を既定で自動調整
- 競合とファイル／データベース差異の詳細な調査・復旧操作を追加
- P2Pのシグナリング、TURN、変更通知、および追跡操作を明確化
- ガベージコレクションV3の安全性とCouchDB向け検証を強化
- コマンド、通知、モバイル画面、および翻訳基盤を改善

## インストール

Obsidian BRATでこのリポジトリを追加し、このリリースを使用してください。

## 含まれるファイル

- `manifest.json`
- `main.js`
- `styles.css`
- ZIPパッケージ

## 注意

このフォークは、上流Self-hosted LiveSyncを日本語化したものです。上流のMIT Licenseと著作権表示を維持しています。

データベースのリセット、サーバーデータの上書き、およびフラグファイルを使用する前に、Vaultとリモートをバックアップしてください。
