import { parse } from "yaml";
import * as ts from "typescript";
import { commonlibEnglishMessages } from "@vrtmrz/livesync-commonlib/context";

const fs = process.getBuiltinModule("node:fs");
const path = process.getBuiltinModule("node:path");
const root = path.resolve(import.meta.dirname, "..");

function loadYamlCatalogue(locale: string): unknown {
    return parse(fs.readFileSync(path.join(root, `src/common/messagesYAML/${locale}.yaml`), "utf8")) as unknown;
}

function flatten(value: unknown, destination: Map<string, string>, prefix = ""): void {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (child && typeof child === "object") {
            flatten(child, destination, fullKey);
        } else {
            destination.set(fullKey.endsWith("._value") ? fullKey.slice(0, -7) : fullKey, String(child));
        }
    }
}

function loadJsonCatalogue(locale: string): Map<string, string> {
    const filename = path.join(root, `src/common/messagesJson/${locale}.json`);
    const parsed: unknown = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new TypeError(`Expected ${filename} to contain a JSON object`);
    }
    return new Map(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
}

function collectSourceFiles(directory: string, files: string[] = []): string[] {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!entry.name.startsWith(".") && !["apps", "dev", "node_modules"].includes(entry.name)) {
                collectSourceFiles(filename, files);
            }
        } else if (/\.(?:ts|svelte)$/.test(entry.name) && !/\.(?:unit\.)?spec\.ts$/.test(entry.name)) {
            files.push(filename);
        }
    }
    return files;
}

function provisionalKeys(): Set<string> {
    const filename = path.join(root, "src/common/messages/LiveSyncProvisionalMessages.ts");
    const sourceText = fs.readFileSync(filename, "utf8");
    const source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true);
    const keys = new Set<string>();

    const visit = (node: ts.Node): void => {
        if (
            ts.isVariableDeclaration(node) &&
            node.name.getText(source) === "liveSyncProvisionalEnglishMessages" &&
            node.initializer
        ) {
            let value = node.initializer;
            while (ts.isAsExpression(value) || ts.isParenthesizedExpression(value)) value = value.expression;
            if (ts.isObjectLiteralExpression(value)) {
                for (const property of value.properties) {
                    if (!ts.isPropertyAssignment(property)) continue;
                    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
                        keys.add(property.name.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return keys;
}

function objectLiteralKeys(filename: string, variableName: string): Set<string> {
    const sourceText = fs.readFileSync(filename, "utf8");
    const source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true);
    const keys = new Set<string>();
    const visit = (node: ts.Node): void => {
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === variableName && node.initializer) {
            let value = node.initializer;
            while (ts.isAsExpression(value) || ts.isParenthesizedExpression(value)) value = value.expression;
            if (ts.isObjectLiteralExpression(value)) {
                for (const property of value.properties) {
                    if (!ts.isPropertyAssignment(property)) continue;
                    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
                        keys.add(property.name.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return keys;
}

function commonlibSettingTextByKey(): Map<string, string[]> {
    const filename = path.join(root, "node_modules/@vrtmrz/livesync-commonlib/dist/common/settingConstants.js");
    const sourceText = fs.readFileSync(filename, "utf8");
    const source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true);
    const settings = new Map<string, string[]>();

    const visit = (node: ts.Node): void => {
        if (
            ts.isVariableDeclaration(node) &&
            node.name.getText(source) === "SettingInformation" &&
            node.initializer &&
            ts.isObjectLiteralExpression(node.initializer)
        ) {
            for (const setting of node.initializer.properties) {
                if (!ts.isPropertyAssignment(setting)) continue;
                if (!ts.isIdentifier(setting.name) && !ts.isStringLiteral(setting.name)) continue;
                if (!ts.isObjectLiteralExpression(setting.initializer)) continue;
                const text = setting.initializer.properties.flatMap((property) => {
                    if (!ts.isPropertyAssignment(property)) return [];
                    if (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) return [];
                    if (property.name.text !== "name" && property.name.text !== "desc") return [];
                    return ts.isStringLiteral(property.initializer) ? [property.initializer.text] : [];
                });
                settings.set(setting.name.text, text);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return settings;
}

function commonlibSettingsRenderedInDialogue(): Set<string> {
    const settings = new Set<string>();
    const dialogueRoot = path.join(root, "src/modules/features/SettingDialogue");
    for (const filename of collectSourceFiles(dialogueRoot)) {
        const sourceText = fs.readFileSync(filename, "utf8");
        const source = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true);
        const visit = (node: ts.Node): void => {
            if (ts.isCallExpression(node)) {
                const name = callName(node);
                if (name?.startsWith("autoWire") || name === "setAuto") {
                    const key = staticString(node.arguments[0]);
                    if (key) settings.add(key);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return settings;
}

function containsJapanese(text: string): boolean {
    return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text);
}

const english = new Map<string, string>();
const japanese = new Map<string, string>();
flatten(loadYamlCatalogue("en"), english);
flatten(loadYamlCatalogue("ja"), japanese);

const errors: string[] = [];
const missingJapanese = [...english.keys()].filter((key) => !japanese.has(key));
const japaneseOnly = [...japanese.keys()].filter((key) => !english.has(key));
if (missingJapanese.length > 0) {
    errors.push(
        `English catalogue entries missing from Japanese (${missingJapanese.length}):\n${missingJapanese.join("\n")}`
    );
}
if (japaneseOnly.length > 0) {
    errors.push(`Japanese-only catalogue entries (${japaneseOnly.length}):\n${japaneseOnly.join("\n")}`);
}

const placeholderPattern = /[$%]?\{[^}]+\}/g;
const canonicalPlaceholderKeys = new Map<string, string>();
for (const key of english.keys()) {
    const normalisedKey = key.toLocaleLowerCase();
    if (canonicalPlaceholderKeys.has(normalisedKey)) {
        canonicalPlaceholderKeys.set(normalisedKey, "");
    } else {
        canonicalPlaceholderKeys.set(normalisedKey, key);
    }
}
const canonicalisePlaceholder = (placeholder: string): string => {
    const match = placeholder.match(/^([%$]?)\{([^}]+)\}$/);
    if (!match) return placeholder;
    const canonicalKey = canonicalPlaceholderKeys.get(match[2].toLocaleLowerCase());
    return canonicalKey ? `${match[1]}{${canonicalKey}}` : placeholder;
};
const placeholderMismatches: string[] = [];
for (const [key, englishValue] of english) {
    const japaneseValue = japanese.get(key);
    if (japaneseValue === undefined) continue;
    const englishPlaceholders = [...englishValue.matchAll(placeholderPattern)]
        .map(([placeholder]) => canonicalisePlaceholder(placeholder))
        .sort();
    const japanesePlaceholders = [...japaneseValue.matchAll(placeholderPattern)]
        .map(([placeholder]) => canonicalisePlaceholder(placeholder))
        .sort();
    if (englishPlaceholders.join("\0") !== japanesePlaceholders.join("\0")) {
        placeholderMismatches.push(
            `${key}: English [${englishPlaceholders.join(", ")}], Japanese [${japanesePlaceholders.join(", ")}]`
        );
    }
}
if (placeholderMismatches.length > 0) {
    errors.push(
        `Catalogue entries with mismatched placeholders (${placeholderMismatches.length}):\n${placeholderMismatches.join("\n")}`
    );
}

for (const locale of ["en", "ja"]) {
    const yaml = locale === "en" ? english : japanese;
    const json = loadJsonCatalogue(locale);
    const missingGenerated = [...yaml.keys()].filter((key) => json.get(key) !== yaml.get(key));
    const generatedOnly = [...json.keys()].filter((key) => !yaml.has(key));
    if (missingGenerated.length > 0 || generatedOnly.length > 0) {
        errors.push(
            `${locale}.json is not generated solely from ${locale}.yaml: ` +
                `missing or changed ${missingGenerated.length}, generated-only ${generatedOnly.length}.`
        );
    }
}

const provisionalSource = fs.readFileSync(
    path.join(root, "src/common/messages/LiveSyncProvisionalMessages.ts"),
    "utf8"
);
if (containsJapanese(provisionalSource)) {
    errors.push(
        "LiveSyncProvisionalMessages.ts contains Japanese text. Provisional messages must remain English fallbacks."
    );
}

const provisional = provisionalKeys();
const hatchJapaneseText = objectLiteralKeys(
    path.join(root, "src/modules/features/SettingDialogue/PaneHatch.ts"),
    "hatchJapaneseText"
);
const settingsJapaneseText = objectLiteralKeys(
    path.join(root, "src/modules/features/SettingDialogue/settingConstants.ts"),
    "unkeyedJapaneseSettingsText"
);
const commonlibSettingText = commonlibSettingTextByKey();
const untranslatedCommonlibSettingsText: string[] = [];
for (const settingKey of commonlibSettingsRenderedInDialogue()) {
    for (const text of commonlibSettingText.get(settingKey) ?? []) {
        if (english.has(text) || settingsJapaneseText.has(text)) continue;
        untranslatedCommonlibSettingsText.push(`${settingKey}: ${text}`);
    }
}
const knownKeys = new Set([...english.keys(), ...provisional, ...Object.keys(commonlibEnglishMessages)]);
const forkOnlyCalls: string[] = [];
const provisionalSettingsCalls: string[] = [];
const invalidDirectUiTextCalls: string[] = [];
const sourceOwnedTextWithUpstreamKey: string[] = [];
const untranslatedHatchProvisionalCalls: string[] = [];

function staticString(node: ts.Expression | undefined): string | undefined {
    return node && ts.isStringLiteral(node) ? node.text : undefined;
}

function callName(node: ts.CallExpression): string | undefined {
    if (ts.isIdentifier(node.expression)) return node.expression.text;
    if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
    return undefined;
}

function lineOf(source: ts.SourceFile, node: ts.Node): number {
    return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

for (const filename of collectSourceFiles(path.join(root, "src"))) {
    const source = fs.readFileSync(filename, "utf8");
    const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
    const translationCall = /(?:\$msg|translateMessage)\(\s*(["'])(.*?)\1/g;
    for (const match of source.matchAll(translationCall)) {
        const key = match[2];
        if (key === undefined || key === "anyKey" || knownKeys.has(key)) continue;
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        forkOnlyCalls.push(`${path.relative(root, filename)}:${line}: ${key}`);
    }

    const relativeFilename = path.relative(root, filename).split(path.sep).join("/");
    const visit = (node: ts.Node): void => {
        if (!ts.isCallExpression(node)) {
            ts.forEachChild(node, visit);
            return;
        }

        const name = callName(node);
        if (name === "uiText" && relativeFilename !== "src/common/uiText.ts") {
            const englishText = staticString(node.arguments[0]);
            const japaneseText = staticString(node.arguments[1]);
            const location = `${relativeFilename}:${lineOf(parsed, node)}`;
            if (!englishText || !japaneseText || node.arguments.length !== 2 || !containsJapanese(japaneseText)) {
                invalidDirectUiTextCalls.push(
                    `${location}: uiText must have one static English literal and one static Japanese literal.`
                );
            } else if (english.has(englishText)) {
                sourceOwnedTextWithUpstreamKey.push(`${location}: ${englishText}`);
            }
        }

        // The settings dialogue is the currently audited UI boundary. An
        // upstream provisional message is deliberately English-only, so it
        // must not be rendered through $msg in this Japanese interface.
        if (
            relativeFilename.startsWith("src/modules/features/SettingDialogue/") &&
            (name === "$msg" || name === "catalogueMessage")
        ) {
            const key = staticString(node.arguments[0]);
            if (key && provisional.has(key)) {
                provisionalSettingsCalls.push(`${relativeFilename}:${lineOf(parsed, node)}: ${key}`);
            }
        }
        if (relativeFilename === "src/modules/features/SettingDialogue/PaneHatch.ts" && name === "hatchText") {
            const key = staticString(node.arguments[0]);
            if (key && provisional.has(key) && !hatchJapaneseText.has(key)) {
                untranslatedHatchProvisionalCalls.push(`${relativeFilename}:${lineOf(parsed, node)}: ${key}`);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(parsed);
}
if (forkOnlyCalls.length > 0) {
    errors.push(`Translation calls with a fork-only key (${forkOnlyCalls.length}):\n${forkOnlyCalls.join("\n")}`);
}
if (provisionalSettingsCalls.length > 0) {
    errors.push(
        `Settings UI calls using an English-only provisional message (${provisionalSettingsCalls.length}):\n` +
            provisionalSettingsCalls.join("\n") +
            "\nUse uiText(english, japanese) until upstream adds a catalogue key."
    );
}
if (invalidDirectUiTextCalls.length > 0) {
    errors.push(
        `Invalid direct UI translations (${invalidDirectUiTextCalls.length}):\n${invalidDirectUiTextCalls.join("\n")}`
    );
}
if (sourceOwnedTextWithUpstreamKey.length > 0) {
    errors.push(
        `Direct UI translations now have an upstream catalogue key (${sourceOwnedTextWithUpstreamKey.length}):\n` +
            sourceOwnedTextWithUpstreamKey.join("\n") +
            "\nRemove uiText and use the upstream $msg key instead."
    );
}
if (untranslatedHatchProvisionalCalls.length > 0) {
    errors.push(
        `Hatch UI provisional messages missing a direct Japanese translation (${untranslatedHatchProvisionalCalls.length}):\n` +
            untranslatedHatchProvisionalCalls.join("\n")
    );
}
if (untranslatedCommonlibSettingsText.length > 0) {
    errors.push(
        `Visible Commonlib settings missing a Japanese source translation (${untranslatedCommonlibSettingsText.length}):\n` +
            untranslatedCommonlibSettingsText.join("\n")
    );
}

if (errors.length > 0) {
    process.stderr.write(`${errors.join("\n\n")}\n`);
    process.exitCode = 1;
} else {
    process.stdout.write(
        "Japanese catalogue parity, generated resources, placeholders, and message ownership are valid.\n"
    );
}
