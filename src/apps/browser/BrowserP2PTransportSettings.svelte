<script lang="ts">
    import { onMount } from "svelte";
    import type { P2PSyncSetting } from "@vrtmrz/livesync-commonlib/compat/common/types";

    import type { P2PReplicatorPaneHost } from "@/features/P2PSync/P2PReplicator/P2PReplicatorPaneHost";

    interface Props {
        host: P2PReplicatorPaneHost;
    }

    let { host }: Props = $props();
    const currentSettings = () => host.services.setting.currentSettings() as P2PSyncSetting;
    const initialSettings = currentSettings();

    let savedTurnServers = $state(initialSettings.P2P_turnServers);
    let savedTurnUsername = $state(initialSettings.P2P_turnUsername);
    let savedTurnCredential = $state(initialSettings.P2P_turnCredential);
    let turnServers = $state(initialSettings.P2P_turnServers);
    let turnUsername = $state(initialSettings.P2P_turnUsername);
    let turnCredential = $state(initialSettings.P2P_turnCredential);

    const isTurnServersModified = $derived(turnServers !== savedTurnServers);
    const isTurnUsernameModified = $derived(turnUsername !== savedTurnUsername);
    const isTurnCredentialModified = $derived(turnCredential !== savedTurnCredential);
    const isModified = $derived(
        isTurnServersModified || isTurnUsernameModified || isTurnCredentialModified
    );

    function loadSettings(settings: P2PSyncSetting): void {
        savedTurnServers = settings.P2P_turnServers;
        savedTurnUsername = settings.P2P_turnUsername;
        savedTurnCredential = settings.P2P_turnCredential;
        turnServers = savedTurnServers;
        turnUsername = savedTurnUsername;
        turnCredential = savedTurnCredential;
    }

    onMount(() =>
        host.services.context.events.onEvent("setting-saved", (settings) => {
            loadSettings(settings as P2PSyncSetting);
        })
    );

    async function save(): Promise<void> {
        await host.services.setting.applyPartial(
            {
                P2P_turnServers: turnServers,
                P2P_turnUsername: turnUsername,
                P2P_turnCredential: turnCredential,
            },
            true
        );
        loadSettings(currentSettings());
    }

    function revert(): void {
        turnServers = savedTurnServers;
        turnUsername = savedTurnUsername;
        turnCredential = savedTurnCredential;
    }
</script>

<section class="browser-p2p-transport-settings">
    <details>
        <summary>任意のTURNサーバー設定</summary>
        <p>
            直接のピアツーピア接続を確立できない場合にのみ、TURNを設定してください。
        </p>
        <label class:is-dirty={isTurnServersModified}>
            <span>TURNサーバーURL（カンマ区切り）</span>
            <input
                type="text"
                placeholder="turn:turn.example.com:3478"
                bind:value={turnServers}
                autocomplete="off"
                spellcheck="false"
                autocorrect="off"
            />
        </label>
        <label class:is-dirty={isTurnUsernameModified}>
            <span>TURNユーザー名</span>
            <input
                type="text"
                placeholder="TURNユーザー名を入力"
                bind:value={turnUsername}
                autocomplete="off"
            />
        </label>
        <label class:is-dirty={isTurnCredentialModified}>
            <span>TURN認証情報</span>
            <input
                type="password"
                placeholder="TURN認証情報を入力"
                bind:value={turnCredential}
                autocomplete="new-password"
            />
        </label>
        <div class="actions">
            <button type="button" class="button mod-cta" disabled={!isModified} onclick={save}>
                TURN設定を保存
            </button>
            <button type="button" class="button" disabled={!isModified} onclick={revert}>
                TURN設定を元に戻す
            </button>
        </div>
    </details>
</section>

<style>
    .browser-p2p-transport-settings {
        margin-bottom: 1rem;
    }
    p {
        margin: 0.75rem 0;
    }
    label {
        display: grid;
        gap: 0.25rem;
        margin: 0.75rem 0;
    }
    label.is-dirty {
        background-color: var(--background-modifier-error);
    }
    input {
        box-sizing: border-box;
        width: 100%;
    }
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
</style>
