# Japanese localisation workflow

This repository is maintained as a Japanese-only fork of Self-hosted LiveSync.
Future translation work is expected to be done with help from an LLM (large language model), so this document records the branch policy, update checks, and release steps in a form that is easy to follow in later sessions.

## Goals

- Keep the plugin usable as a Japanese-only build.
- Keep the cost of tracking upstream releases low.
- Detect upstream message additions and changes with as little manual inspection as possible.
- Release Japanese builds from this fork for installation via Obsidian BRAT.

## Repository roles

- `upstream`: original repository, `https://github.com/vrtmrz/obsidian-livesync`.
- `origin`: this Japanese fork, `https://github.com/Charahiro/obsidian-livesync-ja`.
- `ja-localization`: working branch for Japanese localisation and releases.
- `src/lib`: Git submodule for this fork's `livesync-commonlib-ja`; this contains the main i18n resources.

Do not assume that checking the parent repository is enough. Translation resources live in the `src/lib` submodule, so upstream updates can include important message changes only through a submodule commit change.

The parent repository's `.gitmodules` intentionally points `src/lib` to:

```text
https://github.com/Charahiro/livesync-commonlib-ja
```

When translation resources inside `src/lib` are changed, commit and push them in the submodule repository first. Then commit the updated `src/lib` pointer in the parent repository.

## Localisation policy

Use a pragmatic Japanese-only policy.

- Existing i18n messages: translate in `src/lib/src/common/messagesYAML/ja.yaml`.
- Generated i18n files: regenerate with `npm run bakei18n`.
- Svelte screens with hard-coded English: direct Japanese replacement is acceptable.
- If a hard-coded message has dynamic values or is reused in many places, `$msg(...)` is still acceptable, but it is not required for this fork.
- Keep translation edits grouped in clearly named commits so future upstream merges are easier to review.

Important files:

- `src/lib/src/common/messagesYAML/en.yaml`: upstream English i18n source.
- `src/lib/src/common/messagesYAML/ja.yaml`: Japanese i18n source to edit.
- `src/lib/src/common/i18n.ts`: `$t` and `$msg` implementation.
- `src/lib/src/common/rosetta.ts`: supported language list and message aggregation.
- `src/lib/src/common/settingConstants.ts`: many settings labels and descriptions.
- `src/modules/features/SetupWizard/dialogs/*.svelte`: setup wizard screens with hard-coded UI text.
- `src/features/P2PSync/P2PReplicator/*.svelte`: P2P pane UI text.
- `src/features/P2PSync/P2PReplicator/*View.ts`: P2P pane titles, menus, and confirmation dialogues.
- `src/features/ConfigSync/*.svelte`: customisation sync UI text.
- `src/features/ConfigSync/*.ts`: customisation sync modal titles, menus, confirmations, and notices.
- `src/modules/features/GlobalHistory/GlobalHistory.svelte`: global history UI text.
- `src/modules/features/GlobalHistory/GlobalHistoryView.ts`: global history pane title.
- `updates_ja.md`: Japanese Markdown shown in the settings Change Log pane. `esbuild.config.mjs` uses this file when present, while keeping upstream `updates.md` unchanged.
- `docs/troubleshooting_ja.md`: Japanese Markdown fetched by the Setup tab's Online Tips pane. `PaneSetup.ts` intentionally fetches this from the `ja-localization` branch of this fork.

## Current Japanese translation pass

As of 2026-05-05, this fork has translated the main i18n gaps and the following hard-coded UI areas:

- Setup Wizard dialogs under `src/modules/features/SetupWizard/dialogs`.
- P2P Replicator pane and peer rows under `src/features/P2PSync/P2PReplicator`.
- Config Sync pane, modal, and related notices under `src/features/ConfigSync`.
- Global History pane under `src/modules/features/GlobalHistory`.

Known validation notes:

- `npm run build` runs `npm run bakei18n` first and should be used before release.
- After `npm run bakei18n` or `npm run build`, run this command to avoid noisy generated-file line-ending diffs on this workspace:

```powershell
.\node_modules\.bin\prettier.cmd --config .\.prettierrc.mjs --end-of-line lf "src/lib/src/common/messagesJson/*.json" "src/lib/src/common/messages/*.ts" --write --log-level error
```

- `npm run svelte-check` currently reports one pre-existing error in `src/modules/features/ModuleSetupObsidian.ts` around the `Setup.QRCode` message parameter. Treat this as unrelated unless that file is changed.

## Upstream release update workflow

Use upstream release tags as the update unit.

1. Fetch upstream tags.

```powershell
git fetch upstream --tags
```

2. Pick the previous upstream tag and the new upstream tag.

Use exact tag names from upstream. In examples below:

```powershell
$OLD = "<previous-upstream-tag>"
$NEW = "<new-upstream-tag>"
```

3. Inspect parent repository changes.

```powershell
git diff --name-status $OLD..$NEW
git diff $OLD..$NEW -- src/modules/features src/features src/modules
```

Focus on files that contain user-visible messages. New English text can be added without causing a Git conflict, so this step is important.

4. Inspect the `src/lib` submodule pointer.

```powershell
git diff --submodule=log $OLD..$NEW -- src/lib
```

If the submodule commit changed, compare the submodule contents too. Get the old and new submodule commit IDs from the diff above or from `git ls-tree`.

```powershell
git -C src/lib fetch --tags
git -C src/lib diff <old-src-lib-commit>..<new-src-lib-commit> -- src/common/messagesYAML src/common/messagesJson src/common/settingConstants.ts
```

5. Merge the upstream tag into the Japanese branch.

```powershell
git switch ja-localization
git merge $NEW
```

Resolve conflicts as Japanese text. If the same conflict recurs across releases, enable Git's conflict-resolution reuse feature:

```powershell
git config rerere.enabled true
```

`rerere` means "reuse recorded resolution"; Git can reuse previously recorded conflict resolutions.

6. Update translations.

- Fill missing keys in `src/lib/src/common/messagesYAML/ja.yaml`.
- Translate newly added hard-coded Svelte UI text directly to Japanese.
- Preserve placeholders such as `${name}`, `${value}`, `%{key}`, and URLs unless the surrounding code says otherwise.
- Keep product and technical names consistent: `Self-hosted LiveSync`, `Obsidian`, `Vault`, `CouchDB`, `MinIO`, `S3`, `R2`, `P2P`.

7. Regenerate i18n files.

```powershell
npm run bakei18n
```

8. Check missing i18n keys.

```powershell
node -e "const fs=require('fs');const en=JSON.parse(fs.readFileSync('src/lib/src/common/messagesJson/en.json','utf8'));const ja=JSON.parse(fs.readFileSync('src/lib/src/common/messagesJson/ja.json','utf8'));const missing=Object.keys(en).filter(k=>!(k in ja));console.log(missing.join('\n'));process.exit(missing.length?1:0);"
```

9. Check remaining English UI text.

This is a heuristic check. It will produce false positives, but it is useful after upstream merges.

```powershell
rg -n '>[A-Za-z][^<]*<|title="[A-Za-z]|setButtonText\("[A-Za-z]|setName\("[A-Za-z]|setDesc\("[A-Za-z]' src
```

Review likely user-visible strings. Ignore code identifiers, tests, external names, and intentionally untranslated product names.

10. Build and test.

```powershell
npm run build
```

Run narrower checks if the touched area has tests. For broad localisation-only changes, build success and manual UI inspection are usually the main checks.

## Release workflow for BRAT

Release from `ja-localization`, not necessarily from `main`.

Recommended Japanese release tag format:

```text
ja-<upstream-version>
```

Examples:

```text
ja-0.25.60
ja-0.25.61
```

Before creating a GitHub Release, confirm that the built release assets expected by Obsidian BRAT are present. Typically these are:

- `manifest.json`
- `main.js`
- `styles.css`

If the upstream release process changes, follow upstream's asset set and keep this fork's release assets compatible with BRAT.

The plugin listing shown in Obsidian is controlled by `manifest.json`. For this Japanese fork, keep `id` unchanged for compatibility, but keep `name`, `author`, `authorUrl`, and `description` set to Japanese-fork appropriate values.

This fork has a GitHub Actions release workflow at `.github/workflows/release.yml`.

The workflow runs when a tag matching `ja-*` is pushed. It checks out submodules, runs `npm ci`, runs `npm run build`, verifies `main.js`, `manifest.json`, and `styles.css`, then creates a draft GitHub Release.

The Release description is read from:

```text
.github/release-notes/ja-release.md
```

Update this file for each release before creating the tag. The workflow checks out the tagged commit, so release note edits made after pushing the tag will not be reflected automatically in that Release.

The workflow uploads these assets:

- `main.js`
- `manifest.json`
- `styles.css`
- `obsidian-livesync-ja-<tag>.zip`

Recommended release command sequence:

```powershell
git switch ja-localization
git status --short --branch
notepad .github/release-notes/ja-release.md
git add .github/release-notes/ja-release.md
git commit -m "Update release notes for ja-<upstream-version>"
git push
git tag ja-<upstream-version>
git push origin ja-<upstream-version>
```

After the workflow completes, open the draft Release on GitHub, inspect the attached assets, then publish it manually.

The workflow also supports manual dispatch with a `tag` input, but the tag should already exist.

## LLM handoff checklist

At the beginning of a future localisation session, the assistant should:

1. Read this document.
2. Check `git status --short --branch`.
3. Check remotes with `git remote -v`.
4. Fetch upstream tags if the user asks to update from upstream.
5. Identify the previous Japanese release tag and corresponding upstream tag.
6. Compare upstream tag to upstream tag, not Japanese branch to upstream branch, when looking for upstream message changes.
7. Check `src/lib` submodule changes separately.
8. Preserve user changes and never reset or discard local edits without explicit permission.
9. Translate in Japanese, keeping placeholders and technical terms intact.
10. Run `npm run bakei18n` after editing i18n YAML.
11. Run the missing-key and remaining-English checks before release.

Before pushing localisation work, the assistant must:

1. Check whether `src/lib` has changes with `git -C src/lib status --short --branch`.
2. If `src/lib` has changes, commit them inside the submodule first.
3. Push the submodule branch to `https://github.com/Charahiro/livesync-commonlib-ja`.
4. Only after the submodule push succeeds, commit the updated `src/lib` pointer in the parent repository.
5. Push the parent repository branch to `https://github.com/Charahiro/obsidian-livesync-ja`.
6. Verify both repositories are clean with `git status --short --branch` in the parent and in `src/lib`.

Never leave a parent repository commit pointing to a submodule commit that exists only locally.
