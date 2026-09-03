import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    platform: {
        isMobile: false,
    },
}));

vi.mock("@/deps.ts", () => ({
    Platform: mocks.platform,
    requestUrl: vi.fn(),
}));

vi.mock("@/deps", () => ({
    Platform: mocks.platform,
    requestUrl: vi.fn(),
}));

vi.mock("@/modules/essentialObsidian/APILib/ObsHttpHandler", () => ({
    ObsHttpHandler: class {},
}));

vi.mock("./ObsidianConfirm", () => ({
    ObsidianConfirm: class {},
}));

import { ObsidianAPIService } from "./ObsidianAPIService";
import type { ObsidianServiceContext } from "./ObsidianServiceContext";
import { setLang } from "@/common/translation";

function createService(workspace: Record<string, unknown>, isMobile = false) {
    const addCommand = vi.fn((command) => command);
    const service = new ObsidianAPIService({
        app: { workspace, isMobile },
        plugin: { addCommand },
    } as unknown as ObsidianServiceContext);
    return Object.assign(service, { __testAddCommand: addCommand });
}

beforeEach(() => {
    mocks.platform.isMobile = false;
    vi.clearAllMocks();
});

afterEach(() => setLang("def"));

describe("ObsidianAPIService.showWindowOnRight", () => {
    it("keeps the status view in the right leaf on mobile", async () => {
        mocks.platform.isMobile = true;
        const rightLeaf = {
            setViewState: vi.fn().mockResolvedValue(undefined),
        };
        const workspace = {
            getLeavesOfType: vi.fn(() => []),
            getLeaf: vi.fn(),
            getRightLeaf: vi.fn(() => rightLeaf),
            revealLeaf: vi.fn().mockResolvedValue(undefined),
        };
        const service = createService(workspace, true);

        expect(service.isMobile()).toBe(true);
        await service.showWindowOnRight("p2p-status");

        expect(workspace.getLeavesOfType).toHaveBeenCalledWith("p2p-status");
        expect(workspace.getRightLeaf).toHaveBeenCalledWith(false);
        expect(workspace.getLeaf).not.toHaveBeenCalled();
        expect(rightLeaf.setViewState).toHaveBeenCalledWith({
            type: "p2p-status",
            active: false,
        });
        expect(workspace.revealLeaf).toHaveBeenCalledWith(rightLeaf);
    });
});

describe("ObsidianAPIService command localisation", () => {
    it("waits for the saved display language before registering a command", () => {
        const service = createService({});
        const command = { id: "view-log", name: "Show log", callback: vi.fn() };

        service.addCommand(command);
        expect(service.__testAddCommand).not.toHaveBeenCalled();

        setLang("ja");
        service.activateCommandCatalogue();

        expect(command.name).toBe("ログを表示");
        expect(service.__testAddCommand).toHaveBeenCalledOnce();
    });

    it("uses the catalogue for keyed command names and updates them after a language change", () => {
        const service = createService({});
        const command = { id: "resolve", name: "Pick a file to resolve conflict", callback: vi.fn() };

        service.addCommand(command);
        setLang("ja");
        service.activateCommandCatalogue();
        expect(command.name).toBe("競合を解決するファイルを選択");

        setLang("def");
        service.activateCommandCatalogue();
        expect(command.name).toBe("Pick a file to resolve conflict");
    });
});
