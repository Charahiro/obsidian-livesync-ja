import { afterEach, describe, expect, it } from "vitest";

import { setLang } from "@/common/translation";
import { getConfig, getConfName, localiseUnkeyedSettingsText } from "./settingConstants";

describe("setting manifest labels", () => {
    afterEach(() => setLang("def"));

    it("renders names and descriptions in the selected display language", () => {
        setLang("zh-tw");

        expect(getConfName("liveSync")).toBe("同步模式");
        expect(getConfig("couchDB_URI")).toMatchObject({ name: "伺服器 URI" });
        expect(getConfig("encrypt")).toMatchObject({
            name: "端對端加密",
            desc: "加密遠端資料庫中的內容。如果你使用外掛的同步功能，建議啟用此選項。",
        });
    });

    it("leaves English untouched, so that the catalogue key and its English value stay interchangeable", () => {
        expect(getConfName("liveSync")).toBe("Sync Mode");
        expect(getConfig("encrypt")).toMatchObject({
            name: "End-to-End Encryption",
            desc: "Encrypt contents on the remote database. If you use the plugin's synchronization feature, enabling this is recommended.",
        });
    });

    it("passes through labels which Commonlib owns but the catalogue does not carry", () => {
        setLang("zh-tw");

        expect(getConfName("chunkSplitterVersion")).toBe("Chunk Splitter");
    });

    it("uses source-owned Japanese wording only for upstream labels without catalogue keys", () => {
        setLang("def");
        expect(localiseUnkeyedSettingsText("Selector")).toBe("Selector");

        setLang("ja");

        expect(getConfName("chunkSplitterVersion")).toBe("チャンク分割方式");
        expect(getConfig("showStatusOnEditor")).toMatchObject({
            name: "ステータスをエディタ内に表示",
            desc: "Obsidianの再起動が必要です。",
        });
        expect(localiseUnkeyedSettingsText("Selector")).toBe("選択ルール");
        expect(localiseUnkeyedSettingsText("Scan for Broken files")).toBe("破損ファイルをスキャン");
    });
});
