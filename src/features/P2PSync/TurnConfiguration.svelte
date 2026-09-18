<script lang="ts">
    import { uiText } from "@/common/uiText";
    import { localiseTurnError } from "@/features/P2PSync/turnErrorText";
    import type { P2PConnectionInfo } from "@vrtmrz/livesync-commonlib/compat/common/types";
    import { CLOUDFLARE_TURN_TYPE } from "@/integrations/cloudflare/settings";
    import { validateManagedTurnSettings } from "@/integrations/turnSettings";
    import { translateLiveSyncMessage as translate } from "@/common/translation";

    type TurnSettings = Pick<P2PConnectionInfo, "P2P_turnServers" | "P2P_turnUsername" | "P2P_turnCredential" | "P2P_managedType" | "P2P_managedId" | "P2P_managedToken">;
    let { settings = $bindable() }: { settings: TurnSettings } = $props();
    const managedType = $derived(settings.P2P_managedType ?? "");
    const error = $derived(validateManagedTurnSettings(settings));

    function selectProvider(type: string) {
        settings.P2P_managedType = type || undefined;
        settings.P2P_managedId = type ? "" : undefined;
        settings.P2P_managedToken = type ? "" : undefined;
    }
</script>

<div class="turn-configuration">
    <label>
        <span>{uiText("TURN configuration", "TURN設定")}</span>
        <select aria-label={uiText("TURN configuration", "TURN設定")} name="p2p-turn-source" value={managedType} onchange={(event) => selectProvider(event.currentTarget.value)}>
            <option value="">{uiText("Manual", "手動")}</option>
            <option value={CLOUDFLARE_TURN_TYPE}>{uiText("Managed (Cloudflare)", "管理型（Cloudflare）")}</option>
            {#if managedType !== "" && managedType !== CLOUDFLARE_TURN_TYPE}
                <option value={managedType} disabled>{uiText("Unsupported TURN configuration", "未対応のTURN設定")}</option>
            {/if}
        </select>
    </label>
    {#if managedType === ""}
        <label>
            <span>{translate("TURN Server URLs (comma-separated)")}</span>
            <textarea name="p2p-turn-servers" rows="3" placeholder="turn:turn.example.com:3478"
                bind:value={settings.P2P_turnServers} autocapitalize="off" spellcheck="false"></textarea>
        </label>
        <label>
            <span>{translate("TURN Username")}</span>
            <input type="text" name="p2p-turn-username" placeholder={translate("Enter TURN username")} bind:value={settings.P2P_turnUsername}
                autocomplete="off" autocapitalize="off" spellcheck="false" />
        </label>
        <label>
            <span>{translate("TURN Credential")}</span>
            <input type="password" name="p2p-turn-credential" placeholder={translate("Enter TURN credential")} bind:value={settings.P2P_turnCredential}
                autocomplete="new-password" />
        </label>
    {:else if managedType === CLOUDFLARE_TURN_TYPE}
        <label>
            <span>{uiText("TURN Key ID", "TURNキーID")}</span>
            <input type="text" name="p2p-turn-turnKeyId" bind:value={settings.P2P_managedId}
                autocomplete="off" autocapitalize="off" spellcheck="false" />
        </label>
        <label>
            <span>{uiText("TURN Key API Token", "TURNキーのAPIトークン")}</span>
            <input type="password" name="p2p-turn-apiToken" bind:value={settings.P2P_managedToken}
                autocomplete="new-password" autocapitalize="off" spellcheck="false" />
        </label>
        <p>{uiText("The API token is saved with this profile and included in Setup URI and QR code sharing. Temporary TURN credentials are kept in memory only.", "APIトークンはこのプロファイルに保存され、セットアップURIやQRコードによる共有にも含まれます。一時的なTURN認証情報はメモリ内にのみ保持されます。")}</p>
    {/if}
    {#if error}
        <p role="status" class="turn-error">{localiseTurnError(error)}</p>
    {/if}
</div>

<style>
    label { display: grid; gap: 0.25rem; margin: 0.75rem 0; }
    input, textarea, select { box-sizing: border-box; width: 100%; }
    p { font-size: var(--font-ui-small, 0.9rem); }
    .turn-error { color: var(--text-error, #b33); }
</style>
