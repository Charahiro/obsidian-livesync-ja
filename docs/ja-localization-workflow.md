# Japanese localisation workflow

This repository is maintained as a Japanese-only fork of Self-hosted LiveSync. This document records the update, translation, validation, and BRAT release process.

## Repository roles

- `upstream`: `https://github.com/vrtmrz/obsidian-livesync`
- `origin`: `https://github.com/Charahiro/obsidian-livesync-ja`
- `ja-localization`: the long-lived Japanese release branch
- `codex/ja-<version>-integration`: a temporary integration branch when an upstream release needs conflict resolution and validation

Since Self-hosted LiveSync 1.0, Commonlib is installed as the `@vrtmrz/livesync-commonlib` package. The old `src/lib` Git submodule is no longer part of this repository. Do not reintroduce the submodule workflow.

## The three translation streams

Every upstream update must be checked in all three streams.

### 1. YAML catalogue

Edit the source catalogues in:

- `src/common/messagesYAML/en.yaml`
- `src/common/messagesYAML/ja.yaml`

Generated files under `src/common/messagesJson` and `src/common/messages` must not be edited by hand. Regenerate them with:

```powershell
npm run i18n:bake
```

Preserve placeholders exactly, including `${NAME}`, `%{name}`, URLs, and Markdown syntax. Keep product and technical names consistent, including Self-hosted LiveSync, Obsidian, Vault, CouchDB, S3, MinIO, R2, P2P, WebRTC, TURN, and Setup URI.

Run the Japanese call-site audit after every catalogue or user-interface change:

```powershell
npm run i18n:audit-ja
```

The audit checks literal calls to `$msg(...)` and equivalent helpers. It fails when a Japanese entry is missing or an English phrase remains unchanged, except for an explicit allow-list of technical terms.

### 2. Plug-in-read Markdown

The plug-in displays Markdown from two paths:

- `updates_ja.md` is embedded by `vite.config.ts` for the Change Log pane when the Japanese file exists.
- `docs/troubleshooting_ja.md` is fetched by `PaneSetup.ts` for the Setup pane's online tips.

Documents linked from the online tips are part of the same user path. In 1.0, this includes `docs/recovery_ja.md`. On every upstream release, search for new Markdown entry points with:

```powershell
rg -n 'MarkdownRenderer|request\(|updates\.md|docs/' src vite.config.ts
```

Compare the source documents and update the Japanese counterparts before tagging a release. Prefer Japanese links where a maintained `*_ja.md` file exists.

### 3. Hard-coded user-interface text

New Svelte, TypeScript, command-palette, Notice, dialogue, menu, tooltip, placeholder, and accessibility text can be added without a catalogue conflict.

Prefer `$msg(...)` and a Japanese catalogue entry when a message has parameters, is reused, or belongs to an upstream-owned workflow. Direct Japanese is acceptable for a Japanese-fork-only leaf view when adding a catalogue key would not improve reuse.

Useful heuristic searches are:

```powershell
rg -n --glob '*.svelte' '>\s*[A-Za-z][^<{]*<|title="[A-Za-z]|aria-label="[A-Za-z]' src
rg -n --glob '*.ts' '\.set(Name|Desc|ButtonText|Tooltip|Title)\("[A-Za-z]|name:\s*"[A-Za-z]|title:\s*"[A-Za-z]' src
```

Review the results manually. Ignore tests, code identifiers, URLs, protocol values, product names, and cryptographic algorithm names.

High-priority areas are:

- `src/modules/features/SetupWizard/dialogs`
- `src/features/P2PSync/P2PReplicator`
- `src/modules/features/SettingDialogue`
- `src/modules/features/DocumentHistory`
- `src/modules/features/GlobalHistory`
- `src/features/ConfigSync`
- recovery, conflict-review, command, Notice, and accessibility text

## Updating from an upstream release

Use upstream release tags as the comparison unit.

1. Fetch upstream tags.

```powershell
git fetch upstream --tags
```

2. Compare the previous and new upstream tags.

```powershell
git diff --name-status <old-tag>..<new-tag>
git diff <old-tag>..<new-tag> -- src updates.md docs vite.config.ts manifest.json package.json
```

3. Create an integration branch and merge the new tag.

```powershell
git switch -c codex/ja-<version>-integration
git merge --no-ff <new-tag>
```

4. Resolve architecture and implementation conflicts first. Preserve the Japanese manifest metadata, release workflow, Japanese Markdown selection, and fork URLs where they are intentionally different.

5. Complete all three translation streams: YAML, plug-in-read Markdown, and hard-coded user-interface text.

6. Regenerate and audit translations.

```powershell
npm run i18n:bake
npm run i18n:audit-ja
```

7. Run the repository checks.

```powershell
npm run check
npm run test:unit
npm run build
```

8. Manually inspect the main flows in Obsidian:

- fresh setup and additional-device setup;
- CouchDB, Object Storage, and P2P configuration;
- Fetch, Rebuild, and emergency suspension;
- conflict and file/database inspection;
- P2P status, peer decisions, and follow controls;
- settings, command palette, Notices, tooltips, and mobile-width dialogues;
- Change Log and online troubleshooting Markdown.

## Release workflow for BRAT

Use a Japanese tag in this form:

```text
ja-<upstream-version>
```

For example, Self-hosted LiveSync 1.0.0 uses `ja-1.0.0`.

Before tagging:

1. Update `.github/release-notes/ja-release.md`.
2. Confirm `manifest.json` contains the upstream version and Japanese-fork name, description, author, and URL.
3. Confirm the working tree is clean and all validation commands pass.
4. Build once locally and confirm `main.js`, `manifest.json`, and `styles.css` exist.

The workflow at `.github/workflows/release.yml` runs for `ja-*` tags. It installs dependencies, builds, attests the artefacts, verifies the BRAT files, creates a ZIP package, and publishes the GitHub Release.

Suggested sequence after review and approval:

```powershell
git switch ja-localization
git merge --ff-only codex/ja-<version>-integration
git push origin ja-localization
git tag ja-<version>
git push origin ja-<version>
```

Do not create or push a release tag until the release notes and tagged commit are final. The workflow reads all assets and release notes from that commit.

## Handoff checklist

At the start of a future localisation update:

1. Read this document and the repository's `AGENTS.md`.
2. Check the branch, working tree, remotes, and latest Japanese release tag.
3. Fetch the requested upstream tag.
4. Compare upstream tag to upstream tag before merging.
5. Preserve unrelated local work.
6. Inspect all three translation streams.
7. Keep placeholders and technical terms intact.
8. Run `npm run i18n:bake`, `npm run i18n:audit-ja`, `npm run check`, `npm run test:unit`, and `npm run build`.
9. Record any intentionally untranslated technical strings or deferred manual checks.
10. Do not push, tag, or publish without explicit authority.
