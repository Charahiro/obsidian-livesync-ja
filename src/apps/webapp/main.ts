import { createNativeElement } from "@/apps/browserDom";
import { compatGlobal, _activeDocument } from "@vrtmrz/livesync-commonlib/compat/common/coreEnvFunctions";
import { mount } from "svelte";

import { WebAppRuntime, type WebAppRuntimeStatusKind } from "./WebAppRuntime";
import WebAppP2P from "./WebAppP2P.svelte";
import { VaultHistoryStore, type VaultHistoryItem } from "./vaultSelector";

const historyStore = new VaultHistoryStore();
let runtime: WebAppRuntime | null = null;

type LiveSyncWebAppDebugApi = {
    getRuntime: () => WebAppRuntime | null;
    historyStore: VaultHistoryStore;
};

type LiveSyncWebAppGlobal = typeof compatGlobal & {
    livesyncApp?: LiveSyncWebAppDebugApi;
};

function getRequiredElement<T extends HTMLElement>(id: string): T {
    const element = _activeDocument.getElementById(id);
    if (!element) {
        throw new Error(`Missing element: #${id}`);
    }
    return element as T;
}

function setStatus(kind: WebAppRuntimeStatusKind, message: string): void {
    const statusEl = getRequiredElement<HTMLDivElement>("status");
    statusEl.className = kind;
    statusEl.textContent = message;
}

function setBusyState(isBusy: boolean): void {
    const pickNewBtn = getRequiredElement<HTMLButtonElement>("pick-new-vault");
    pickNewBtn.disabled = isBusy;

    const historyButtons = _activeDocument.querySelectorAll<HTMLButtonElement>(".vault-item button");
    historyButtons.forEach((button) => {
        button.disabled = isBusy;
    });
}

function formatLastUsed(unixMillis: number): string {
    if (!unixMillis) {
        return "不明";
    }
    return new Date(unixMillis).toLocaleString();
}

async function renderHistoryList(): Promise<VaultHistoryItem[]> {
    const listEl = getRequiredElement<HTMLDivElement>("vault-history-list");
    const emptyEl = getRequiredElement<HTMLParagraphElement>("vault-history-empty");

    const [items, lastUsedId] = await Promise.all([historyStore.getVaultHistory(), historyStore.getLastUsedVaultId()]);

    listEl.replaceChildren();
    emptyEl.classList.toggle("is-hidden", items.length > 0);

    for (const item of items) {
        const row = createNativeElement(_activeDocument, "div");
        row.className = "vault-item";

        const info = createNativeElement(_activeDocument, "div");
        info.className = "vault-item-info";

        const name = createNativeElement(_activeDocument, "div");
        name.className = "vault-item-name";
        name.textContent = item.name;

        const meta = createNativeElement(_activeDocument, "div");
        meta.className = "vault-item-meta";
        const label = item.id === lastUsedId ? "前回使用" : "使用";
        meta.textContent = `${label}: ${formatLastUsed(item.lastUsedAt)}`;

        info.append(name, meta);

        const useButton = createNativeElement(_activeDocument, "button");
        useButton.type = "button";
        useButton.textContent = "このVaultを使用";
        useButton.addEventListener("click", () => {
            void startWithHistory(item);
        });

        row.append(info, useButton);
        listEl.appendChild(row);
    }

    return items;
}

async function startWithHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    setStatus("info", `Vault「${handle.name}」でLiveSyncを開始しています`);
    const nextRuntime = new WebAppRuntime(handle, { reportStatus: setStatus });
    await nextRuntime.start();
    runtime = nextRuntime;

    const selectorEl = getRequiredElement<HTMLDivElement>("vault-selector");
    selectorEl.classList.add("is-hidden");

    const p2pControl = getRequiredElement<HTMLElement>("p2p-control");
    mount(WebAppP2P, {
        target: p2pControl,
        props: {
            runtime: nextRuntime,
        },
    });
    p2pControl.classList.remove("is-hidden");
}

async function startWithHistory(item: VaultHistoryItem): Promise<void> {
    setBusyState(true);
    let handle: FileSystemDirectoryHandle;
    try {
        handle = await historyStore.activateHistoryItem(item);
    } catch (error) {
        setStatus("error", `保存済みVaultを開けませんでした：${String(error)}`);
        setBusyState(false);
        return;
    }
    try {
        await startWithHandle(handle);
    } catch (error) {
        setStatus("error", `LiveSyncの開始に失敗しました：${String(error)}`);
        setBusyState(false);
    }
}

async function startWithNewPicker(): Promise<void> {
    setBusyState(true);
    let handle: FileSystemDirectoryHandle;
    try {
        handle = await historyStore.pickNewVault();
    } catch (error) {
        setStatus("warning", `Vaultの選択が中止されたか、失敗しました：${String(error)}`);
        setBusyState(false);
        return;
    }
    try {
        await startWithHandle(handle);
    } catch (error) {
        setStatus("error", `LiveSyncの開始に失敗しました：${String(error)}`);
        setBusyState(false);
    }
}

async function initialiseVaultSelector(): Promise<void> {
    setStatus("info", "LiveSyncを開始するVaultフォルダを選択してください。");

    const pickNewBtn = getRequiredElement<HTMLButtonElement>("pick-new-vault");
    pickNewBtn.addEventListener("click", () => {
        void startWithNewPicker();
    });

    await renderHistoryList();
}

compatGlobal.addEventListener("load", () => {
    initialiseVaultSelector().catch((error) => {
        setStatus("error", `初期化に失敗しました：${String(error)}`);
    });
});

compatGlobal.addEventListener("beforeunload", () => {
    void runtime?.shutdown();
});

(compatGlobal as LiveSyncWebAppGlobal).livesyncApp = {
    getRuntime: () => runtime,
    historyStore,
};
