<script lang="ts">
    // import { delay } from "octagonal-wheels/promises";
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import InputRow from "@/modules/services/LiveSyncUI/components/InputRow.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import { PouchDB } from "@vrtmrz/livesync-commonlib/compat/pouchdb/pouchdb-browser";
    import {
        DEFAULT_SETTINGS,
        P2P_DEFAULT_SETTINGS,
        PREFERRED_BASE,
        RemoteTypes,
        type EntryDoc,
        type ObsidianLiveSyncSettings,
        type P2PConnectionInfo,
        type P2PSyncSetting,
    } from "@vrtmrz/livesync-commonlib/compat/common/types";

    import { TrysteroReplicator } from "@vrtmrz/livesync-commonlib/compat/replication/trystero/TrysteroReplicator";
    import type { ReplicatorHostEnv } from "@vrtmrz/livesync-commonlib/compat/replication/trystero/types";
    import {
        copyTo,
        generateP2PRoomId,
        pickP2PSyncSettings,
        type SimpleStore,
    } from "@vrtmrz/livesync-commonlib/compat/common/utils";
    import { onMount } from "svelte";
    import { getDialogContext, type GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { SETTING_KEY_P2P_DEVICE_NAME } from "@vrtmrz/livesync-commonlib/compat/common/types";
    import ExtraItems from "@/modules/services/LiveSyncUI/components/ExtraItems.svelte";
    import { TYPE_CANCELLED, type SetupRemoteP2PResultType } from "./setupDialogTypes";
    import { LOG_LEVEL_VERBOSE, Logger } from "octagonal-wheels/common/logger";
    import { $msg as translateMessage } from "@/common/translation";
    import { probeP2PSetupConnection } from "./p2pSetupConnectionProbe";

    const default_setting = pickP2PSyncSettings(DEFAULT_SETTINGS);
    let syncSetting = $state<P2PConnectionInfo>({ ...default_setting });

    const context = getDialogContext();
    let error = $state("");
    type Props = GuestDialogProps<SetupRemoteP2PResultType, P2PSyncSetting>;

    const { setResult, getInitialData }: Props = $props();
    onMount(() => {
        let initialData: P2PSyncSetting | undefined = undefined;
        if (getInitialData) {
            initialData = getInitialData();
            if (initialData) {
                copyTo(initialData, syncSetting);
            }
        }
        const initialPeerName = (initialData?.P2P_DevicePeerName ?? "").trim();
        if (initialPeerName !== "") {
            return;
        }
        const cachedPeerName = context.services.config.getSmallConfig(SETTING_KEY_P2P_DEVICE_NAME);
        if (cachedPeerName) {
            syncSetting.P2P_DevicePeerName = cachedPeerName as string;
        }
    });
    function generateSetting() {
        const connSetting: P2PSyncSetting = {
            // remoteType: ",
            ...P2P_DEFAULT_SETTINGS,
            ...syncSetting,
            P2P_Enabled: true,
        };
        const trialSettings: P2PSyncSetting = {
            ...connSetting,
        };
        const trialRemoteSetting: ObsidianLiveSyncSettings = {
            ...DEFAULT_SETTINGS,
            ...PREFERRED_BASE,
            remoteType: RemoteTypes.REMOTE_P2P,
            ...trialSettings,
        };
        return trialRemoteSetting;
    }

    async function checkConnection() {
        try {
            processing = true;
            const trialRemoteSetting = generateSetting();
            const map = new Map<string, string>();
            const store = {
                get: (key: string) => {
                    return Promise.resolve(map.get(key) || null);
                },
                set: (key: string, value: any) => {
                    map.set(key, value);
                    return Promise.resolve();
                },
                delete: (key: string) => {
                    map.delete(key);
                    return Promise.resolve();
                },
                keys: () => {
                    return Promise.resolve(Array.from(map.keys()));
                },
                get db() {
                    return Promise.resolve(this);
                },
            } as SimpleStore<any>;

            const dummyPouch = new PouchDB<EntryDoc>("dummy");
            const env: ReplicatorHostEnv = {
                events: context.context.events,
                translate: context.context.translate,
                settings: trialRemoteSetting,
                processReplicatedDocs: async (_docs: any[]) => {
                    return;
                },
                confirm: context.services.confirm,
                db: dummyPouch,
                simpleStore: store,
                deviceName: syncSetting.P2P_DevicePeerName || "unnamed-device",
                platform: "setup-wizard",
            };
            const replicator = new TrysteroReplicator(env);
            try {
                const result = await probeP2PSetupConnection(replicator);
                if (!result.ok) {
                    return `Failed to connect to the signalling relay: ${result.reason}`;
                }
                return "";
            } finally {
                try {
                    await replicator.close();
                    await dummyPouch.destroy();
                } catch (e) {
                    Logger(e, LOG_LEVEL_VERBOSE, "setup-p2p-cleanup");
                }
            }
        } finally {
            processing = false;
        }
    }
    function setDefaultRelay() {
        syncSetting.P2P_relays = P2P_DEFAULT_SETTINGS.P2P_relays;
    }

    let processing = $state(false);
    function generateDefaultGroupId() {
        syncSetting.P2P_roomID = generateP2PRoomId();
    }

    async function checkAndCommit() {
        error = "";
        try {
            error = (await checkConnection()) || "";
            if (!error) {
                const setting = generateSetting();
                setResult(pickP2PSyncSettings(setting));
                return;
            }
        } catch (e) {
            error = `Error during connection test: ${e}`;
            return;
        }
    }
    function commit() {
        const setting = pickP2PSyncSettings(generateSetting());
        setResult(setting);
    }
    function cancel() {
        setResult(TYPE_CANCELLED);
    }
    const canProceed = $derived.by(() => {
        return (
            syncSetting.P2P_relays.trim() !== "" &&
            syncSetting.P2P_roomID.trim() !== "" &&
            syncSetting.P2P_passphrase.trim() !== "" &&
            (syncSetting.P2P_DevicePeerName ?? "").trim() !== ""
        );
    });
</script>

<DialogHeader title="P2P設定" />
<Guidance>ピアツーピア同期に必要な情報を入力してください。</Guidance>
<InputRow label="有効">
    <input type="checkbox" name="p2p-enabled" bind:checked={syncSetting.P2P_Enabled} />
</InputRow>
<InputRow label={translateMessage("Signalling relay URLs")}>
    <input
        type="text"
        name="p2p-relay-url"
        placeholder="wss://relay.example.com"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.P2P_relays}
    />
    <button class="button" onclick={() => setDefaultRelay()}>
        {translateMessage("Use the project's public signalling relay")}
    </button>
</InputRow>
<InfoNote>
    {translateMessage("Peer discovery uses Nostr-compatible signalling relays.")}
    {translateMessage(
        "The project's public signalling relay is a best-effort convenience operated by the project author. It does not store Vault contents, but signalling metadata may be visible to the relay. Availability and log retention are not guaranteed. You can replace it with your own Nostr-compatible relay."
    )}
    <a
        href="https://github.com/vrtmrz/obsidian-livesync/blob/main/docs/p2p.md"
        target="_blank"
        rel="noopener noreferrer">{translateMessage("Learn more about P2P connections")}</a
    >.
</InfoNote>
<InputRow label="グループID">
    <input
        type="text"
        name="p2p-room-id"
        placeholder="123-456-789-abc"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.P2P_roomID}
    />
    <button class="button" onclick={() => generateDefaultGroupId()}>ランダムIDを生成</button>
</InputRow>
<InputRow label="パスフレーズ">
    <Password name="p2p-password" placeholder="パスフレーズを入力" bind:value={syncSetting.P2P_passphrase} />
</InputRow>
<InfoNote>
    グループIDとパスフレーズで端末のグループを識別します。同期するすべての端末で同じグループIDとパスフレーズを使用してください。<br />
    グループIDは自動生成される形式に限らず、任意の文字列を使用できます。
</InfoNote>
<InputRow label="端末のピアID">
    <input
        type="text"
        name="p2p-device-peer-id"
        placeholder="main-iphone16"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.P2P_DevicePeerName}
    />
</InputRow>
<InputRow label="P2P接続を自動開始">
    <input type="checkbox" name="p2p-auto-start" bind:checked={syncSetting.P2P_AutoStart} />
</InputRow>
<InfoNote>
    有効にすると、プラグインの起動時にP2P接続を自動的に開始します。
</InfoNote>
<InputRow label={translateMessage("Announce changes automatically after connecting")}>
    <input type="checkbox" name="p2p-auto-broadcast" bind:checked={syncSetting.P2P_AutoBroadcast} />
</InputRow>
<InfoNote>
    {translateMessage(
        "When enabled, this device notifies connected peers after a local change. The notification contains no Vault data; a peer which follows this device then fetches the change through the encrypted P2P connection."
    )}
</InfoNote>
<ExtraItems title="詳細設定">
    <InfoNote>
        TURNサーバーの設定は、厳格なNATやファイアウォールによって端末間の直接接続が妨げられる場合にのみ必要です。通常は空欄のままで構いません。
    </InfoNote>
    <InfoNote warning>
        {translateMessage(
            "TURN relays the encrypted WebRTC connection only when a direct path cannot be established. A TURN provider cannot read encrypted Vault contents, but it can observe connection metadata and traffic volume. Use a provider you trust."
        )}
        <a
            href="https://github.com/vrtmrz/obsidian-livesync/blob/main/docs/p2p.md#signalling-relay-and-turn-server"
            target="_blank"
            rel="noopener noreferrer">{translateMessage("Learn more about signalling and TURN")}</a
        >.
    </InfoNote>
    <InputRow label="TURNサーバーURL（コンマ区切り）">
        <textarea
            name="p2p-turn-servers"
            placeholder="turn:turn.example.com:3478,turn:turn.example.com:443"
            autocapitalize="off"
            spellcheck="false"
            bind:value={syncSetting.P2P_turnServers}
            rows="5"
        ></textarea>
    </InputRow>
    <InputRow label="TURNユーザー名">
        <input
            type="text"
            name="p2p-turn-username"
            placeholder="TURNユーザー名を入力"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            bind:value={syncSetting.P2P_turnUsername}
        />
    </InputRow>
    <InputRow label="TURN認証情報">
        <Password
            name="p2p-turn-credential"
            placeholder="TURN認証情報を入力"
            bind:value={syncSetting.P2P_turnCredential}
        />
    </InputRow>
</ExtraItems>
<InfoNote error visible={error !== ""}>
    {error}
</InfoNote>
{#if processing}
    接続を確認しています。しばらくお待ちください。
{:else}
    <UserDecisions>
        <Decision title="設定をテストして続行" important disabled={!canProceed} commit={() => checkAndCommit()} />
        <Decision title="そのまま続行" commit={() => commit()} />
        <Decision title="キャンセル" commit={() => cancel()} />
    </UserDecisions>
{/if}
