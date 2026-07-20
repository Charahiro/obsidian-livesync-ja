# Self-hosted LiveSync 日本語化フォーク

Self-hosted LiveSync 0.25.77 をベースにした日本語化フォークです。

この Release は、上流 0.25.77 への追従と日本語化フォーク側の翻訳を含む更新版です。

## 主な内容

- 上流 Self-hosted LiveSync 0.25.77 の変更を取り込み
- Obsidian v1.7.2 以降でファイル削除時に Obsidian のゴミ箱設定（`FileManager.trashFile` API）を尊重するよう改善された件の取り込み
- ライブラリ型定義の追加や、大規模な型エラー修正およびリファクタリング、インポートパスの正規化の取り込み
- CLI や webapp のサブプロジェクトのワークスペース化の取り込み
- 変更履歴タブ用の `updates_ja.md` を 0.25.77 まで更新
- BRAT 向けに Release へ必要な成果物を添付

## インストール

Obsidian BRAT でこのリポジトリを追加し、この Release を使用してください。

## 含まれるファイル

- `manifest.json`
- `main.js`
- `styles.css`
- zip パッケージ

## 注意

このフォークは上流の Self-hosted LiveSync を日本語化したものです。
上流の MIT License と著作権表示を維持しています。
