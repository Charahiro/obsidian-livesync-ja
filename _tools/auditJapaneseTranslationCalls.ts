import { parse } from "yaml";

const fs = process.getBuiltinModule("node:fs");
const path = process.getBuiltinModule("node:path");
const root = path.resolve(import.meta.dirname, "..");

function loadCatalogue(locale: string): unknown {
    const filename = path.join(root, `src/common/messagesYAML/${locale}.yaml`);
    return parse(fs.readFileSync(filename, "utf8")) as unknown;
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

function collectSourceFiles(directory: string, files: string[] = []): string[] {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!["apps", "dev", "node_modules"].includes(entry.name)) {
                collectSourceFiles(fullPath, files);
            }
        } else if (/\.(?:ts|svelte)$/.test(entry.name) && !/\.(?:unit\.)?spec\.ts$/.test(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

const flatCatalogue = new Map<string, string>();
const flatEnglishCatalogue = new Map<string, string>();
flatten(loadCatalogue("ja"), flatCatalogue);
flatten(loadCatalogue("en"), flatEnglishCatalogue);

const missingCatalogueEntries = [...flatEnglishCatalogue.keys()].filter((key) => !flatCatalogue.has(key));
const extraCatalogueEntries = [...flatCatalogue.keys()].filter((key) => !flatEnglishCatalogue.has(key));
const placeholderMismatches: string[] = [];
const placeholderPattern = /[$%]?\{[A-Za-z_][A-Za-z0-9_.-]*\}/g;
for (const [key, englishValue] of flatEnglishCatalogue) {
    const japaneseValue = flatCatalogue.get(key);
    if (japaneseValue === undefined) continue;
    const englishPlaceholders = [...englishValue.matchAll(placeholderPattern)].map(([placeholder]) => placeholder).sort();
    const japanesePlaceholders = [...japaneseValue.matchAll(placeholderPattern)].map(([placeholder]) => placeholder).sort();
    if (englishPlaceholders.join("\0") !== japanesePlaceholders.join("\0")) {
        placeholderMismatches.push(
            `${key}: English [${englishPlaceholders.join(", ")}], Japanese [${japanesePlaceholders.join(", ")}]`
        );
    }
}

const missingTranslationCalls: string[] = [];
const untranslated: string[] = [];
const intentionallyUnchanged = new Set(["Setup URI"]);
const translationCall = /(?:\$msg|translateMessage|\bmsg)\(\s*(["'])(.*?)\1/g;
for (const file of collectSourceFiles(path.join(root, "src"))) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(translationCall)) {
        const key = match[2];
        if (key === undefined || key === "anyKey") continue;
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        const location = `${path.relative(root, file)}:${line}`;
        if (!flatCatalogue.has(key)) {
            const englishValue = flatEnglishCatalogue.get(key);
            missingTranslationCalls.push(
                `${location}: ${key}${englishValue && englishValue !== key ? ` => ${englishValue}` : ""}`
            );
        } else if (flatCatalogue.get(key) === key && /[A-Za-z]{3}/.test(key) && !intentionallyUnchanged.has(key)) {
            untranslated.push(`${location}: ${key}`);
        }
    }
}

if (missingCatalogueEntries.length > 0) {
    process.stderr.write(`English catalogue entries missing from Japanese (${missingCatalogueEntries.length}):\n`);
    process.stderr.write(`${missingCatalogueEntries.join("\n")}\n`);
}
if (extraCatalogueEntries.length > 0) {
    process.stderr.write(`Japanese catalogue entries missing from English (${extraCatalogueEntries.length}):\n`);
    process.stderr.write(`${extraCatalogueEntries.join("\n")}\n`);
}
if (placeholderMismatches.length > 0) {
    process.stderr.write(`Catalogue entries with mismatched placeholders (${placeholderMismatches.length}):\n`);
    process.stderr.write(`${placeholderMismatches.join("\n")}\n`);
}
if (missingTranslationCalls.length > 0) {
    process.stderr.write(`Translation calls with no Japanese catalogue entry (${missingTranslationCalls.length}):\n`);
    process.stderr.write(`${missingTranslationCalls.join("\n")}\n`);
}
if (untranslated.length > 0) {
    process.stderr.write(`Translation calls whose Japanese value is unchanged (${untranslated.length}):\n`);
    process.stderr.write(`${untranslated.join("\n")}\n`);
}
if (
    missingCatalogueEntries.length === 0 &&
    extraCatalogueEntries.length === 0 &&
    placeholderMismatches.length === 0 &&
    missingTranslationCalls.length === 0 &&
    untranslated.length === 0
) {
    process.stdout.write("Japanese catalogue coverage, placeholders, and literal translation calls are valid.\n");
}

process.exitCode =
    missingCatalogueEntries.length > 0 ||
    extraCatalogueEntries.length > 0 ||
    placeholderMismatches.length > 0 ||
    missingTranslationCalls.length > 0 ||
    untranslated.length > 0
        ? 1
        : 0;
