# Japanese localisation workflow

This repository is a Japanese-only fork of Self-hosted LiveSync. Its purpose is
to provide Japanese user-facing text while following upstream implementation,
message ownership, and release decisions as closely as possible.

The fork is a temporary compatibility layer. If upstream provides complete
Japanese localisation, this fork should be archived and users should be
directed to upstream.

## Repository roles

- `upstream`: `https://github.com/vrtmrz/obsidian-livesync`
- `origin`: `https://github.com/Charahiro/obsidian-livesync-ja`
- `ja-localization`: the long-lived Japanese release branch
- `codex/ja-<version>-integration`: a temporary integration branch for one
  upstream release

Since Self-hosted LiveSync 1.0, Commonlib is installed as the
`@vrtmrz/livesync-commonlib` package. The old `src/lib` Git submodule is not
part of this repository and must not be restored.

## Localisation policy

### Upstream is authoritative

Upstream owns application behaviour, English source text, message keys, and
the translation architecture. A localisation change in this fork must not
change behaviour, create a message key, or redesign an upstream flow.

When upstream changes or adds a Japanese translation, use the upstream wording.
Remove a conflicting fork-specific wording rather than retaining a local
variation. When upstream adds a message key, follow that key. When upstream
does not yet expose a message through its catalogue, do not create a fork-only
key to work around it.

### Catalogue messages

`src/common/messagesYAML/en.yaml` defines the available LiveSync-owned message
keys. In this fork, edit only `src/common/messagesYAML/ja.yaml` and only for a
key which already exists in upstream `en.yaml`.

- Add a Japanese value when an upstream English key has no Japanese value.
- Preserve placeholders, URLs, Markdown, and key names exactly.
- Retain an upstream Japanese value whenever one exists.
- Never add a key to `en.yaml` for the Japanese fork.
- Never add a Japanese-only key.

`src/common/messagesJson` and `src/common/messages` are generated artefacts.
Do not edit them by hand. After editing YAML, regenerate them with:

```powershell
npm run i18n:bake
```

Do not place Japanese text in `LiveSyncProvisionalMessages.ts`. That map is the
English fallback for every language, not a Japanese catalogue. A provisional
English message is not an upstream catalogue key. It exists to keep an
English-only upstream message within the `$msg` type and fallback boundary.
Do not edit, remove, or add entries to that upstream-owned map in this fork.

An English-only provisional message is permitted for log-only diagnostics, but
it must not be rendered directly in the Japanese settings interface. Until
upstream gives the text a catalogue key, render it with `uiText` as described
below.

### Direct user-interface text

Upstream still contains user-facing English literals and English-only
provisional messages in TypeScript and Svelte files. For text which upstream
has not made translatable, use `uiText` in this fork. This is a direct source
translation, not a catalogue key:

```ts
uiText("Connection settings", "接続設定");
```

`uiText` returns the Japanese literal only when the display language is
Japanese; it returns the upstream English literal for every other language.
Keeping both values at the call site makes the upstream source and the
temporary Japanese wording traceable.

When one coherent interface panel contains many English-only provisional
messages, a source-owned English-to-Japanese map may be clearer than repeating
many pairs inline. Its rendering helper must return the normal `$msg(...)`
result for messages outside the map, and the translation audit must require a
Japanese map entry for every static provisional message it renders. Keep this
map beside that panel; do not move it into the upstream provisional map or a
fork catalogue.

Commonlib settings are a separate instance of this rule. Commonlib supplies
their English `name` and `desc` values without LiveSync catalogue keys. Keep
Japanese counterparts only in
`src/modules/features/SettingDialogue/settingConstants.ts`. The Japanese audit
reads the Commonlib setting metadata and every setting rendered by the
Settings dialogue, and fails if an unkeyed visible name or description has no
entry in that source-owned map. When upstream or Commonlib assigns a catalogue
key, remove the map entry and use that key instead.

Commands are another separate boundary. Commands may be registered before
persisted settings are loaded, including commands registered by Commonlib. The
Obsidian API service therefore queues registrations until `displayLanguage` is
known, then resolves a catalogue key where one exists. English-only command
literals are kept in `src/common/commandText.ts` as a source-owned map. Do not
change Commonlib to carry fork wording, and do not add a YAML key for these
names. When upstream provides a key, remove the map entry and let the normal
catalogue path handle it.

- Change only the displayed text. Keep control flow, data, identifiers, and
  message construction unchanged.
- Do not introduce a new catalogue key or a provisional message merely to
  translate an upstream literal.
- Do not call `$msg(...)` for an English-only provisional message in the
  settings interface. Use `uiText` instead.
- Do not translate protocol values, URLs, code identifiers, command names
  which must be typed verbatim, product names, or cryptographic algorithm
  names unless upstream already translates them.
- Include dialogues, Notices, commands, menus, tooltips, placeholders, and
  accessibility text when they are user-facing.

`npm run i18n:audit-ja` enforces this rule for the settings interface and
registered commands. It rejects a provisional `$msg(...)` call there, validates that every `uiText`
call contains static English and Japanese literals, rejects a direct pair once
its English text becomes an upstream catalogue key, and checks the Hatch
panel's provisional-message map for complete coverage. It also inspects this
repository's and the installed Commonlib's static command registrations, and
fails when an unkeyed English command name lacks a source-owned Japanese map
entry. Extend the same audit boundary before adding a new settings or interface
renderer; do not rely on a manual search alone.

When upstream later replaces a direct text with an existing or new `$msg(...)`
key:

1. Remove the fork's `uiText(...)` call.
2. Keep the upstream call and implementation unchanged.
3. Remove the corresponding entry from a source-owned direct-text map, if one
   is used.
4. Add the Japanese value to `ja.yaml` only if upstream has not already done
   so.
5. Regenerate the catalogue artefacts.

This rule deliberately makes a temporary source diff disappear when upstream
adopts the message into its translation system.

Useful searches for candidate literals are:

```powershell
rg -n --glob '*.svelte' '>\s*[A-Za-z][^<{]*<|title="[A-Za-z]|aria-label="[A-Za-z]' src
rg -n --glob '*.ts' '\.set(Name|Desc|ButtonText|Tooltip|Title)\("[A-Za-z]|name:\s*"[A-Za-z]|title:\s*"[A-Za-z]' src
```

Review matches manually. Tests, comments, and log-only diagnostics are not
translation targets. Code identifiers, URLs, protocol values, and technical
names are not translation targets unless users see them as ordinary interface
text.

### Plug-in-read Markdown

The fork may maintain Japanese counterparts for Markdown which the plug-in
shows to users:

- `updates_ja.md` is embedded for the Change Log pane when present.
- `docs/troubleshooting_ja.md` is fetched by the Setup pane's online tips
  when the display language is Japanese. It is read from this fork's
  `ja-localization` branch; other languages continue to use upstream.
- Documents linked from those tips, including `docs/recovery_ja.md`, are part
  of the same user path.

Compare these documents with upstream on every release. If upstream supplies a
Japanese counterpart, use it. Otherwise, keep the fork counterpart aligned
with the current upstream source. Search for new plug-in-read documents with:

```powershell
rg -n 'MarkdownRenderer|request\(|updates\.md|docs/' src vite.config.ts
```

## Updating from an upstream release

Use upstream release tags as the comparison unit.

1. Fetch upstream tags.

    ```powershell
    git fetch upstream --tags
    ```

2. Compare the previous and new tags, concentrating first on user-visible
   source, YAML catalogues, Markdown, manifest metadata, and build files.

    ```powershell
    git diff --name-status <old-tag>..<new-tag>
    git diff <old-tag>..<new-tag> -- src updates.md docs vite.config.ts manifest.json package.json
    ```

3. Create an integration branch and merge the new tag.

    ```powershell
    git switch -c codex/ja-<version>-integration
    git merge --no-ff <new-tag>
    ```

4. Resolve implementation conflicts in favour of upstream. Preserve only the
   intentional fork differences: Japanese wording, Japanese Markdown
   selection, Japanese manifest metadata, fork release assets, and fork URLs.

5. Review every changed user-facing string.
    - For an upstream `$msg(...)` key, update `ja.yaml` if required.
    - For an upstream literal, translate the literal directly without changing
      its structure.
    - If upstream has promoted a previously direct literal to a key, remove the
      direct translation and use the YAML rule above.

6. Compare `en.yaml` and `ja.yaml`. The Japanese catalogue must contain every
   upstream English key and no Japanese-only key. Check placeholders for every
   shared key.

7. Regenerate and validate translations.

    ```powershell
    npm run i18n:bake
    npm run i18n:audit-ja
    ```

8. Run repository checks.

    ```powershell
    npm run check
    npm run test:unit
    npm run build
    ```

9. Inspect the main Obsidian flows manually: initial and additional-device
   setup, CouchDB, Object Storage, and P2P configuration, Fast Setup, rebuild,
   emergency suspension, conflict and file/database inspection, settings,
   commands, Notices, tooltips, narrow dialogues, Change Log, and online
   troubleshooting Markdown.

## Release workflow for BRAT

Use a Japanese tag in this form:

```text
ja-<upstream-version>
```

Only upstream tags in the exact numeric form `X.Y.Z` are release candidates.
Process them in version order. A candidate whose upstream GitHub Release is
marked as a pre-release is published as the corresponding Japanese pre-release.
Skip beta, release-candidate, patch, and other suffix-tagged versions such as
`X.Y.Z-beta.1`, `X.Y.Z-rc.1`, and `X.Y.Z-patch.1`.

Before tagging:

1. Update `.github/release-notes/ja-release.md`. Its first line must be
   `# Self-hosted LiveSync 日本語版 <upstream-version>`; the release workflow
   rejects a mismatched title.
2. Confirm that `manifest.json` contains the upstream version and intended
   Japanese-fork metadata.
3. Confirm a clean working tree and passing validation.
4. Build once locally and confirm that `main.js`, `manifest.json`, and
   `styles.css` exist.

The workflow at `.github/workflows/release.yml` runs for `ja-*` tags. It first
calls the complete `unit-ci` workflow against the exact tagged commit. Only
after every verification job succeeds does it install dependencies, build,
attest the artefacts, verify the BRAT files, create a ZIP package, and publish
the GitHub Release. A normal push to `ja-localization` continues to run CI
only and does not publish a release. The release workflow reads the upstream
GitHub Release metadata and mirrors its pre-release status; it rejects a fork
tag that is not exactly `ja-X.Y.Z`.

Suggested sequence after review and approval:

```powershell
git switch ja-localization
git merge --ff-only codex/ja-<version>-integration
git push origin ja-localization
git tag ja-<version>
git push origin ja-<version>
```

Do not create or push a release tag until the release notes and tagged commit
are final.

### Correcting a published release body

If only the published GitHub Release text is incorrect, update
`.github/release-notes/ja-release.md`, commit and push the correction to
`ja-localization`, then update the existing release without moving its tag or
rebuilding its assets:

```powershell
gh release edit ja-<upstream-version> --notes-file .github/release-notes/ja-release.md
gh release view ja-<upstream-version> --json tagName,body,url
```

Confirm that the returned `tagName` and the first line of `body` contain the
same upstream version. Do not recreate the release, force-move the tag, or
upload replacement artefacts for a text-only correction.

## Fork completion

At each upstream release, check whether the fork still has a purpose. Archive
the fork when all of the following are true:

1. Upstream `ja.yaml` contains every upstream `en.yaml` key with matching
   placeholders.
2. Upstream has translated the remaining user-facing literals, or none remain
   relevant to the supported plug-in interface.
3. Upstream provides the Japanese plug-in-read documentation needed for the
   supported user paths.
4. No fork-only Japanese source, catalogue, Markdown, manifest, or release
   change remains necessary for users.

Before archiving, publish a final notice directing users to the upstream
release, and retain the repository as a read-only historical record.

## Handoff checklist

1. Read this document and `AGENTS.md`.
2. Check the branch, working tree, remotes, latest Japanese tag, and requested
   upstream tag.
3. Compare the old and new upstream tags before merging.
4. Preserve unrelated local work.
5. Apply the catalogue, direct-text, and Markdown rules above.
6. Keep placeholders and technical names intact.
7. Run `npm run i18n:bake`, `npm run i18n:audit-ja`, `npm run check`,
   `npm run test:unit`, and `npm run build`.
8. Record deferred translations and any manual checks.
9. Do not push, tag, publish, or archive without explicit authority.
