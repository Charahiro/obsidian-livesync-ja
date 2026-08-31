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
                    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) keys.add(property.name.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return keys;
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
    errors.push(`English catalogue entries missing from Japanese (${missingJapanese.length}):\n${missingJapanese.join("\n")}`);
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
        placeholderMismatches.push(`${key}: English [${englishPlaceholders.join(", ")}], Japanese [${japanesePlaceholders.join(", ")}]`);
    }
}
if (placeholderMismatches.length > 0) {
    errors.push(`Catalogue entries with mismatched placeholders (${placeholderMismatches.length}):\n${placeholderMismatches.join("\n")}`);
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

const provisionalSource = fs.readFileSync(path.join(root, "src/common/messages/LiveSyncProvisionalMessages.ts"), "utf8");
if (containsJapanese(provisionalSource)) {
    errors.push("LiveSyncProvisionalMessages.ts contains Japanese text. Provisional messages must remain English fallbacks.");
}

const knownKeys = new Set([...english.keys(), ...provisionalKeys(), ...Object.keys(commonlibEnglishMessages)]);
const forkOnlyCalls: string[] = [];
for (const filename of collectSourceFiles(path.join(root, "src"))) {
    const source = fs.readFileSync(filename, "utf8");
    const translationCall = /(?:\$msg|translateMessage)\(\s*(["'])(.*?)\1/g;
    for (const match of source.matchAll(translationCall)) {
        const key = match[2];
        if (key === undefined || key === "anyKey" || knownKeys.has(key)) continue;
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        forkOnlyCalls.push(`${path.relative(root, filename)}:${line}: ${key}`);
    }
}
if (forkOnlyCalls.length > 0) {
    errors.push(
        `Translation calls with a fork-only key (${forkOnlyCalls.length}):\n${forkOnlyCalls.join("\n")}`
    );
}

if (errors.length > 0) {
    process.stderr.write(`${errors.join("\n\n")}\n`);
    process.exitCode = 1;
} else {
    process.stdout.write("Japanese catalogue parity, generated resources, placeholders, and message ownership are valid.\n");
}
