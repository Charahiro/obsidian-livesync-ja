import { currentLang } from "./translation.ts";

/**
 * Localise a user-interface literal which upstream has not exposed as a
 * catalogue message. Keep both texts at the call site so the upstream English
 * source remains traceable until it gains a catalogue key.
 */
export function uiText(english: string, japanese: string): string {
    return currentLang === "ja" ? japanese : english;
}

/** Apply the same display-language rule to a source-owned direct-text map. */
export function uiTextFromMap(english: string, japanese: string): string {
    return uiText(english, japanese);
}
