<script lang="ts">
    // import { delay } from "octagonal-wheels/promises";
    import DialogHeader from "@/lib/src/UI/components/DialogHeader.svelte";
    import Guidance from "@/lib/src/UI/components/Guidance.svelte";
    import Decision from "@/lib/src/UI/components/Decision.svelte";
    import UserDecisions from "@/lib/src/UI/components/UserDecisions.svelte";
    import InfoNote from "@/lib/src/UI/components/InfoNote.svelte";
    import InputRow from "@/lib/src/UI/components/InputRow.svelte";
    import Password from "@/lib/src/UI/components/Password.svelte";
    import { PouchDB } from "../../../../lib/src/pouchdb/pouchdb-browser";
    import {
        DEFAULT_SETTINGS,
        P2P_DEFAULT_SETTINGS,
        PREFERRED_BASE,
        RemoteTypes,
        type EntryDoc,
        type ObsidianLiveSyncSettings,
        type P2PConnectionInfo,
        type P2PSyncSetting,
    } from "../../../../lib/src/common/types";

    import { TrysteroReplicator } from "../../../../lib/src/replication/trystero/TrysteroReplicator";
    import type { ReplicatorHostEnv } from "../../../../lib/src/replication/trystero/types";
    import { copyTo, pickP2PSyncSettings, type SimpleStore } from "../../../../lib/src/common/utils";
    import { onMount } from "svelte";
    import { getDialogContext, type GuestDialogProps } from "../../../../lib/src/UI/svelteDialog";
    import { SETTING_KEY_P2P_DEVICE_NAME } from "../../../../lib/src/common/types";
    import ExtraItems from "../../../../lib/src/UI/components/ExtraItems.svelte";

    const default_setting = pickP2PSyncSettings(DEFAULT_SETTINGS);
    let syncSetting = $state<P2PConnectionInfo>({ ...default_setting });

    const context = getDialogContext();
    let error = $state("");
    const TYPE_CANCELLED = "cancelled";
    type SettingInfo = P2PConnectionInfo;
    type ResultType = typeof TYPE_CANCELLED | SettingInfo;
    type Props = GuestDialogProps<ResultType, P2PSyncSetting>;

    const { setResult, getInitialData }: Props = $props();
    onMount(() => {
        if (getInitialData) {
            const initialData = getInitialData();
            if (initialData) {
                copyTo(initialData, syncSetting);
            }
            if (context.services.config.getSmallConfig(SETTING_KEY_P2P_DEVICE_NAME)) {
                syncSetting.P2P_DevicePeerName = context.services.config.getSmallConfig(
                    SETTING_KEY_P2P_DEVICE_NAME
                ) as string;
            } else {
                syncSetting.P2P_DevicePeerName = "";
            }
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
                settings: trialRemoteSetting,
                processReplicatedDocs: async (docs: any[]) => {
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
                await replicator.setOnSetup();
                await replicator.allowReconnection();
                await replicator.open();
                for (let i = 0; i < 10; i++) {
                    // await delay(1000);
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    // Logger(`Checking known advertisements... (${i})`, LOG_LEVEL_INFO);
                    if (replicator.knownAdvertisements.length > 0) {
                        break;
                    }
                }
                // context.holdingSettings = trialRemoteSetting;

                if (replicator.knownAdvertisements.length === 0) {
                    return "設定は正しいようですが、他のピアが見つかりませんでした。";
                }
                return "";
            } catch (e) {
                return `他のピアに接続できませんでした: ${e}`;
            } finally {
                try {
                    replicator.close();
                    dummyPouch.destroy();
                } catch (e) {
                    console.error(e);
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
        const randomValues = new Uint16Array(4);
        crypto.getRandomValues(randomValues);
        const MAX_UINT16 = 65536;
        const a = Math.floor((randomValues[0] / MAX_UINT16) * 1000);
        const b = Math.floor((randomValues[1] / MAX_UINT16) * 1000);
        const c = Math.floor((randomValues[2] / MAX_UINT16) * 1000);
        const d_range = 36 * 36 * 36;
        const d = Math.floor((randomValues[3] / MAX_UINT16) * d_range);
        syncSetting.P2P_roomID = `${a.toString().padStart(3, "0")}-${b
            .toString()
            .padStart(3, "0")}-${c.toString().padStart(3, "0")}-${d.toString(36).padStart(3, "0")}`;
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
            error = `接続テスト中にエラーが発生しました: ${e}`;
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
<Guidance>Peer-to-Peer同期情報を入力してください。</Guidance>
<InputRow label="有効">
    <input type="checkbox" name="p2p-enabled" bind:checked={syncSetting.P2P_Enabled} />
</InputRow>
<InputRow label="リレーURL">
    <input
        type="text"
        name="p2p-relay-url"
        placeholder="リレーURLを入力"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.P2P_relays}
    />
    <button class="button" onclick={() => setDefaultRelay()}>vrtmrzのリレーを使用</button>
</InputRow>
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
    グループIDとパスフレーズは、同期するデバイスのグループを識別するために使用されます。同期したいすべてのデバイスで同じグループIDとパスフレーズを使用してください。<br />
    グループIDは生成された形式に限定されません。任意の文字列をグループIDとして使用できます。
</InfoNote>
<InputRow label="デバイスピアID">
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
    「P2P接続を自動開始」を有効にすると、プラグイン起動時にP2P接続が自動的に開始されます。
</InfoNote>
<InputRow label="変更を自動ブロードキャスト">
    <input type="checkbox" name="p2p-auto-broadcast" bind:checked={syncSetting.P2P_AutoBroadcast} />
</InputRow>
<InfoNote>
    「変更を自動ブロードキャスト」を有効にすると、手動操作なしで接続済みピアへ変更が自動的に通知されます。通知を受けたピアは、このデバイスの変更を取得します。
</InfoNote>
<ExtraItems title="詳細設定">
    <InfoNote>
        TURNサーバー設定は、直接P2P接続を妨げる厳格なNATやファイアウォールの内側にいる場合にのみ必要です。ほとんどの場合、これらの項目は空欄のままで構いません。
    </InfoNote>
    <InfoNote warning>
        公開TURNサーバーを使用すると、データが第三者のサーバーを経由するため、プライバシー上の影響があります。データが暗号化されていても、あなたの存在は知られる可能性があります。利用前にTURNサーバー提供者を信頼できることを確認してください。ネットワーク管理者についても同様です。可能であれば、自分のFQDN用にTURNサーバーを用意することを検討してください。
    </InfoNote>
    <InputRow label="TURNサーバーURL（カンマ区切り）">
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
        <Decision title="このまま続行" commit={() => commit()} />
        <Decision title="キャンセル" commit={() => cancel()} />
    </UserDecisions>
{/if}
