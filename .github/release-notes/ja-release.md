# Self-hosted LiveSync 日本語版 1.0.27

upstream Self-hosted LiveSync 1.0.27 を取り込んだ日本語化リリースです。

## 同期とストレージ

### 修正

- 空のリモート（新しい Cloudflare R2 バケットを含む）を初めてオブジェクトストレージとして設定する際、**カスタム HTTP ハンドラーを使用する**を有効にしていてもセットアップが完了するようになりました。同期開始に必要なリモート状態を作成できます。

## BRATによる導入手順（推奨）

1. Obsidian の**コミュニティプラグイン**から BRAT をインストールして有効化します。
2. BRAT の**Add a beta plugin for testing**を開きます。
3. 追加するリポジトリに `https://github.com/Charahiro/obsidian-livesync-ja` を指定します。
4. インストール後、Obsidian のコミュニティプラグイン画面で**Self-hosted LiveSync 日本語版**を有効化します。
5. 本家版と日本語版を同時に有効化しないでください。切替前に Vault とリモートデータをバックアップしてください。
6. 複数端末で利用する場合は、すべての端末を同じ日本語版バージョンへ更新してください。

## 配布物

- `manifest.json`（BRAT 取得用）
- `main.js`（BRAT 取得用）
- `styles.css`（BRAT 取得用）
- 配布用 ZIP パッケージ
