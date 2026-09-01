import { afterEach, describe, expect, it } from "vitest";

import { setLang } from "./translation.ts";
import { uiText } from "./uiText.ts";

describe("uiText", () => {
    afterEach(() => setLang("def"));

    it("uses the direct Japanese wording only when Japanese is selected", () => {
        setLang("def");
        expect(uiText("Connection settings", "接続設定")).toBe("Connection settings");

        setLang("ja");
        expect(uiText("Connection settings", "接続設定")).toBe("接続設定");
    });
});
