# Self-hosted LiveSync 日本語版 1.0.29

upstream Self-hosted LiveSync 1.0.29 を取り込んだ日本語化リリースです。

## P2P同期

### 新機能

- 直接接続できない端末間の接続を補助する、**管理型（Cloudflare）** TURN に対応しました。TURNキーIDとAPIトークンを入力すると、一時的なTURN認証情報を自動取得します。（#1182）
- 管理型TURN設定は暗号化されたP2Pプロファイルに保存され、セットアップURIやQRコードによる共有にも含まれます。生成するレポートにはAPIトークンを含めません。

## コマンドラインツール

### 修正

- CLIデーモンが起動時に既存ファイルを同期し、停止中に行われた編集や削除も取り込むようになりました。
- 以前のスキャンやファイル検索の後に、CLIのVaultスキャンがファイルを見落とす問題を修正しました。PR #1188 の修正を取り込んでいます。

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
