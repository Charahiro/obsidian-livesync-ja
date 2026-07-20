<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { AutoAccepting, DEFAULT_SETTINGS, type P2PSyncSetting } from "@lib/common/types";
    import {
        AcceptedStatus,
        ConnectionStatus,
        type PeerStatus,
    } from "@lib/replication/trystero/P2PReplicatorPaneCommon";
    import type { LiveSyncTrysteroReplicator } from "@lib/replication/trystero/LiveSyncTrysteroReplicator";
    import PeerStatusRow from "@/features/P2PSync/P2PReplicator/PeerStatusRow.svelte";
    import { EVENT_LAYOUT_READY, eventHub } from "@/common/events";
    import {
        type PeerInfo,
        type P2PServerInfo,
        EVENT_SERVER_STATUS,
        EVENT_REQUEST_STATUS,
        EVENT_P2P_REPLICATOR_STATUS,
    } from "@lib/replication/trystero/TrysteroReplicatorP2PServer";
    import { type P2PReplicatorStatus } from "@lib/replication/trystero/TrysteroReplicator";
    import { $msg as _msg } from "@lib/common/i18n";
    import { SETTING_KEY_P2P_DEVICE_NAME } from "@lib/common/types";
    import { generateP2PRoomId } from "@lib/common/utils";
    import type { LiveSyncBaseCore } from "@/LiveSyncBaseCore";

    interface Props {
        cmdSync: LiveSyncTrysteroReplicator;
        core: LiveSyncBaseCore;
    }

    let { cmdSync, core }: Props = $props();
    // const cmdSync = plugin.getAddOn<P2PReplicator>("P2PReplicator")!;
    setContext("getReplicator", () => cmdSync);
    const currentSettings = () => core.services.setting.currentSettings() as P2PSyncSetting;
    const initialSettings = { ...currentSettings() } as P2PSyncSetting;

    let settings = $state<P2PSyncSetting>(initialSettings);

    let deviceName = $state<string>("");

    let eP2PEnabled = $state<boolean>(initialSettings.P2P_Enabled);
    let eRelay = $state<string>(initialSettings.P2P_relays);
    let eRoomId = $state<string>(initialSettings.P2P_roomID);
    let ePassword = $state<string>(initialSettings.P2P_passphrase);
    let eAppId = $state<string>(initialSettings.P2P_AppID);
    let eDeviceName = $state<string>("");
    let eAutoAccept = $state<boolean>(initialSettings.P2P_AutoAccepting == AutoAccepting.ALL);
    let eAutoStart = $state<boolean>(initialSettings.P2P_AutoStart);
    let eAutoBroadcast = $state<boolean>(initialSettings.P2P_AutoBroadcast);

    const isP2PEnabledModified = $derived.by(() => eP2PEnabled !== settings.P2P_Enabled);
    const isRelayModified = $derived.by(() => eRelay !== settings.P2P_relays);
    const isRoomIdModified = $derived.by(() => eRoomId !== settings.P2P_roomID);
    const isPasswordModified = $derived.by(() => ePassword !== settings.P2P_passphrase);
    const isAppIdModified = $derived.by(() => eAppId !== settings.P2P_AppID);
    const isDeviceNameModified = $derived.by(() => eDeviceName !== deviceName);
    const isAutoAcceptModified = $derived.by(() => eAutoAccept !== (settings.P2P_AutoAccepting == AutoAccepting.ALL));
    const isAutoStartModified = $derived.by(() => eAutoStart !== settings.P2P_AutoStart);
    const isAutoBroadcastModified = $derived.by(() => eAutoBroadcast !== settings.P2P_AutoBroadcast);

    const isAnyModified = $derived.by(
        () =>
            isP2PEnabledModified ||
            isRelayModified ||
            isRoomIdModified ||
            isPasswordModified ||
            isAppIdModified ||
            isDeviceNameModified ||
            isAutoAcceptModified ||
            isAutoStartModified ||
            isAutoBroadcastModified
    );

    async function saveAndApply() {
        // const newSettings = {
        //     ...currentSettings(),
        //     P2P_Enabled: eP2PEnabled,
        //     P2P_relays: eRelay,
        //     P2P_roomID: eRoomId,
        //     P2P_passphrase: ePassword,
        //     P2P_AppID: eAppId,
        //     P2P_AutoAccepting: eAutoAccept ? AutoAccepting.ALL : AutoAccepting.NONE,
        //     P2P_AutoStart: eAutoStart,
        //     P2P_AutoBroadcast: eAutoBroadcast,
        // };
        await core.services.setting.applyPartial(
            {
                P2P_Enabled: eP2PEnabled,
                P2P_relays: eRelay,
                P2P_roomID: eRoomId,
                P2P_passphrase: ePassword,
                P2P_AppID: eAppId,
                P2P_AutoAccepting: eAutoAccept ? AutoAccepting.ALL : AutoAccepting.NONE,
                P2P_AutoStart: eAutoStart,
                P2P_AutoBroadcast: eAutoBroadcast,
            },
            true
        );
        core.services.config.setSmallConfig(SETTING_KEY_P2P_DEVICE_NAME, eDeviceName);
        deviceName = eDeviceName;
    }
    async function revert() {
        eP2PEnabled = settings.P2P_Enabled;
        eRelay = settings.P2P_relays;
        eRoomId = settings.P2P_roomID;
        ePassword = settings.P2P_passphrase;
        eAppId = settings.P2P_AppID;
        eAutoAccept = settings.P2P_AutoAccepting == AutoAccepting.ALL;
        eAutoStart = settings.P2P_AutoStart;
        eAutoBroadcast = settings.P2P_AutoBroadcast;
    }

    let serverInfo = $state<P2PServerInfo | undefined>(undefined);
    let replicatorInfo = $state<P2PReplicatorStatus | undefined>(undefined);
    const applyLoadSettings = (d: P2PSyncSetting, force: boolean) => {
        if (force) {
            const initDeviceName =
                core.services.config.getSmallConfig(SETTING_KEY_P2P_DEVICE_NAME) ?? core.services.vault.getVaultName();
            deviceName = initDeviceName;
            eDeviceName = initDeviceName;
        }
        const { P2P_relays, P2P_roomID, P2P_passphrase, P2P_AppID, P2P_AutoAccepting } = d;
        if (force || !isP2PEnabledModified) eP2PEnabled = d.P2P_Enabled;
        if (force || !isRelayModified) eRelay = P2P_relays;
        if (force || !isRoomIdModified) eRoomId = P2P_roomID;
        if (force || !isPasswordModified) ePassword = P2P_passphrase;
        if (force || !isAppIdModified) eAppId = P2P_AppID;
        const newAutoAccept = P2P_AutoAccepting === AutoAccepting.ALL;
        if (force || !isAutoAcceptModified) eAutoAccept = newAutoAccept;
        if (force || !isAutoStartModified) eAutoStart = d.P2P_AutoStart;
        if (force || !isAutoBroadcastModified) eAutoBroadcast = d.P2P_AutoBroadcast;

        settings = d;
    };
    onMount(() => {
        const r = eventHub.onEvent("setting-saved", async (d) => {
            applyLoadSettings(d, false);
            closeServer();
        });
        const rx = eventHub.onEvent(EVENT_LAYOUT_READY, () => {
            applyLoadSettings(currentSettings(), true);
        });
        const r2 = eventHub.onEvent(EVENT_SERVER_STATUS, (status) => {
            serverInfo = status;
            advertisements = status?.knownAdvertisements ?? [];
        });
        const r3 = eventHub.onEvent(EVENT_P2P_REPLICATOR_STATUS, (status) => {
            replicatorInfo = status;
        });
        eventHub.emitEvent(EVENT_REQUEST_STATUS);
        return () => {
            r();
            rx();
            r2();
            r3();
        };
    });
    let isConnected = $derived.by(() => {
        return serverInfo?.isConnected ?? false;
    });
    let serverPeerId = $derived.by(() => {
        return serverInfo?.serverPeerId ?? "";
    });
    let advertisements = $state<PeerInfo[]>([]);

    let autoSyncPeers = $derived.by(() =>
        settings.P2P_AutoSyncPeers.split(",")
            .map((e) => e.trim())
            .filter((e) => e)
    );
    let autoWatchPeers = $derived.by(() =>
        settings.P2P_AutoWatchPeers.split(",")
            .map((e) => e.trim())
            .filter((e) => e)
    );
    let syncOnCommand = $derived.by(() =>
        settings.P2P_SyncOnReplication.split(",")
            .map((e) => e.trim())
            .filter((e) => e)
    );

    const peers = $derived.by(() =>
        advertisements.map((ad) => {
            let accepted: AcceptedStatus;
            const isTemporaryAccepted = ad.isTemporaryAccepted;
            if (isTemporaryAccepted === undefined) {
                if (ad.isAccepted === undefined) {
                    accepted = AcceptedStatus.UNKNOWN;
                } else {
                    accepted = ad.isAccepted ? AcceptedStatus.ACCEPTED : AcceptedStatus.DENIED;
                }
            } else if (isTemporaryAccepted === true) {
                accepted = AcceptedStatus.ACCEPTED_IN_SESSION;
            } else {
                accepted = AcceptedStatus.DENIED_IN_SESSION;
            }
            const isFetching = replicatorInfo?.replicatingFrom.indexOf(ad.peerId) !== -1;
            const isSending = replicatorInfo?.replicatingTo.indexOf(ad.peerId) !== -1;
            const isWatching = replicatorInfo?.watchingPeers.indexOf(ad.peerId) !== -1;
            const syncOnStart = autoSyncPeers.indexOf(ad.name) !== -1;
            const watchOnStart = autoWatchPeers.indexOf(ad.name) !== -1;
            const syncOnReplicationCommand = syncOnCommand.indexOf(ad.name) !== -1;
            const st: PeerStatus = {
                name: ad.name,
                peerId: ad.peerId,
                accepted: accepted,
                status: ad.isAccepted ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED,
                isSending: isSending,
                isFetching: isFetching,
                isWatching: isWatching,
                syncOnConnect: syncOnStart,
                watchOnConnect: watchOnStart,
                syncOnReplicationCommand: syncOnReplicationCommand,
            };
            return st;
        })
    );

    function useDefaultRelay() {
        eRelay = DEFAULT_SETTINGS.P2P_relays;
    }
    function chooseRandom() {
        eRoomId = generateP2PRoomId();
    }

    async function openServer() {
        await cmdSync.open();
    }
    async function closeServer() {
        await cmdSync.close();
    }
    function startBroadcasting() {
        void cmdSync.enableBroadcastChanges();
    }
    function stopBroadcasting() {
        void cmdSync.disableBroadcastChanges();
    }

    const initialDialogStatusKey = `p2p-dialog-status`;
    const getDialogStatus = () => {
        try {
            const initialDialogStatus = JSON.parse(core.services.config.getSmallConfig(initialDialogStatusKey) ?? "{}") as {
                notice?: boolean;
                setting?: boolean;
            };
            return initialDialogStatus;
        } catch {
            return {};
        }
    };
    const initialDialogStatus = getDialogStatus();
    let isNoticeOpened = $state<boolean>(initialDialogStatus.notice ?? true);
    let isSettingOpened = $state<boolean>(initialDialogStatus.setting ?? true);
    $effect(() => {
        const dialogStatus = {
            notice: isNoticeOpened,
            setting: isSettingOpened,
        };
        core.services.config.setSmallConfig(initialDialogStatusKey, JSON.stringify(dialogStatus));
    });
    let isObsidian = $derived.by(() => {
        return core.services.API.getPlatform() === "obsidian";
    });
</script>

<article>
    <h1>Peer-to-Peerレプリケーター</h1>
    <details bind:open={isNoticeOpened}>
        <summary>{_msg("P2P.Note.Summary")}</summary>
        <p class="important">{_msg("P2P.Note.important_note")}</p>
        <p class="important-sub">
            {_msg("P2P.Note.important_note_sub")}
        </p>
        {#each _msg("P2P.Note.description").split("\n\n") as paragraph}
            <p>{paragraph}</p>
        {/each}
    </details>
    <h2>接続設定</h2>
    {#if isObsidian}
        Obsidianのプラグイン設定から構成できます。
    {:else}
        <details bind:open={isSettingOpened}>
            <summary>{eRelay}</summary>
            <table class="settings">
                <tbody>
                    <tr>
                        <th> P2Pレプリケーターを有効化 </th>
                        <td>
                            <label class={{ "is-dirty": isP2PEnabledModified }}>
                                <input type="checkbox" bind:checked={eP2PEnabled} />
                            </label>
                        </td>
                    </tr><tr>
                        <th> リレー設定 </th>
                        <td>
                            <label class={{ "is-dirty": isRelayModified }}>
                                <input
                                    type="text"
                                    placeholder="wss://exp-relay.vrtmrz.net, wss://xxxxx"
                                    bind:value={eRelay}
                                    autocomplete="off"
                                />
                                <button onclick={() => useDefaultRelay()}> vrtmrzのリレーを使用 </button>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th> ルームID </th>
                        <td>
                            <label class={{ "is-dirty": isRoomIdModified }}>
                                <input
                                    type="text"
                                    placeholder="room-id"
                                    bind:value={eRoomId}
                                    autocomplete="off"
                                    spellcheck="false"
                                    autocorrect="off"
                                />
                                <button onclick={() => chooseRandom()}> ランダム番号を使用 </button>
                            </label>
                            <span>
                                <small>
                                    デバイス間の接続を分離できます。同じデバイス間では同じルームIDを使用してください。</small
                                >
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <th> パスワード </th>
                        <td>
                            <label class={{ "is-dirty": isPasswordModified }}>
                                <input type="password" placeholder="パスワード" bind:value={ePassword} />
                            </label>
                            <span>
                                <small>
                                    このパスワードは接続の暗号化に使用されます。十分に長いものを使用してください。
                                </small>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <th> このデバイス名 </th>
                        <td>
                            <label class={{ "is-dirty": isDeviceNameModified }}>
                                <input
                                    type="text"
                                    placeholder="iphone-16"
                                    bind:value={eDeviceName}
                                    autocomplete="off"
                                />
                            </label>
                            <span>
                                <small>
                                    デバイスを識別するための名前です。安定したピア検出のため、"iphone-16" や "macbook-2021" のような短めの名前を使用してください。
                                </small>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <th> 自動接続 </th>
                        <td>
                            <label class={{ "is-dirty": isAutoStartModified }}>
                                <input type="checkbox" bind:checked={eAutoStart} />
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th> 接続時に変更ブロードキャストを開始 </th>
                        <td>
                            <label class={{ "is-dirty": isAutoBroadcastModified }}>
                                <input type="checkbox" bind:checked={eAutoBroadcast} />
                            </label>
                        </td>
                    </tr>
                    <!-- <tr>
                <th> 自動承認 </th>
                <td>
                    <label class={{ "is-dirty": isAutoAcceptModified }}>
                        <input type="checkbox" bind:checked={eAutoAccept} />
                    </label>
                </td>
            </tr> -->
                </tbody>
            </table>
            <button disabled={!isAnyModified} class="button mod-cta" onclick={saveAndApply}>保存して適用</button>
            <button disabled={!isAnyModified} class="button" onclick={revert}>変更を戻す</button>
        </details>
    {/if}

    <div>
        <h2>シグナリングサーバー接続</h2>
        <div>
            {#if !isConnected}
                <p>未接続</p>
            {:else}
                <p>シグナリングサーバーへ接続中（ピアID: {serverPeerId}）</p>
            {/if}
        </div>
        <div>
            {#if !isConnected}
                <button onclick={openServer}>接続</button>
            {:else}
                <button onclick={closeServer}>切断</button>
                {#if replicatorInfo?.isBroadcasting !== undefined}
                    {#if replicatorInfo?.isBroadcasting}
                        <button onclick={stopBroadcasting}>ブロードキャストを停止</button>
                    {:else}
                        <button onclick={startBroadcasting}>ブロードキャストを開始</button>
                    {/if}
                {/if}
                <details>
                    <summary>ブロードキャストとは？</summary>
                    <p>
                        <small>
                            `LiveSync` を使う場合は、変更をブロードキャストする必要があります。これを検出したすべての `watching` ピアは、取得のためのレプリケーションを開始します。<br />
                            ただし、秘匿性をさらに高めたい場合は有効にしないでください。
                        </small>
                    </p>
                </details>
            {/if}
        </div>
    </div>

    <div>
        <h2>ピア</h2>
        <table class="peers">
            <thead>
                <tr>
                    <th>名前</th>
                    <th>操作</th>
                    <th>コマンド</th>
                </tr>
            </thead>
            <tbody>
                {#each peers as peer}
                    <PeerStatusRow peerStatus={peer}></PeerStatusRow>
                {/each}
            </tbody>
        </table>
    </div>
</article>

<style>
    article {
        max-width: 100%;
    }
    article p {
        user-select: text;
        -webkit-user-select: text;
    }
    h2 {
        margin-top: var(--size-4-1);
        margin-bottom: var(--size-4-1);
        padding-bottom: var(--size-4-1);
        border-bottom: 1px solid var(--background-modifier-border);
    }
    label.is-dirty {
        background-color: var(--background-modifier-error);
    }
    input {
        background-color: transparent;
    }
    th {
        /* display: flex;
        justify-content: center;
        align-items: center; */
        min-height: var(--input-height);
    }
    td {
        min-height: var(--input-height);
    }
    td > label {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        min-height: var(--input-height);
    }
    td > label > * {
        margin: auto var(--size-4-1);
    }
    table.peers {
        width: 100%;
    }
    .important {
        color: var(--text-error);
        font-size: 1.2em;
        font-weight: bold;
    }
    .important-sub {
        color: var(--text-warning);
    }
    .settings label {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        flex-wrap: wrap;
    }
</style>
