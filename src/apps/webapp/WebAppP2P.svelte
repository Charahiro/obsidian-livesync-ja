<script lang="ts">
    import P2PReplicatorPane from "@/features/P2PSync/P2PReplicator/P2PReplicatorPane.svelte";
    import BrowserP2PTransportSettings from "@/apps/browser/BrowserP2PTransportSettings.svelte";
    import type { WebAppRuntime } from "./WebAppRuntime";

    interface Props {
        runtime: WebAppRuntime;
    }

    let { runtime }: Props = $props();
    let isScanning = $state(false);
    let scanStatus = $state("");

    async function scanLocalFiles() {
        isScanning = true;
        scanStatus = "ローカルファイルをスキャンしています…";
        try {
            scanStatus = (await runtime.scanLocalFiles())
                ? "ローカルファイルを同期できる状態になりました。"
                : "ローカルファイルのスキャンを完了できませんでした。";
        } catch (error) {
            scanStatus = `ローカルファイルのスキャンに失敗しました：${String(error)}`;
        } finally {
            isScanning = false;
        }
    }
</script>

<div class="local-file-actions">
    <button type="button" disabled={isScanning} onclick={scanLocalFiles}>ローカルファイルをスキャン</button>
    <span role="status" aria-live="polite">{scanStatus}</span>
</div>

<BrowserP2PTransportSettings host={runtime.p2pPaneHost} />
<P2PReplicatorPane
    host={runtime.p2pPaneHost}
/>

<style>
    .local-file-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }
</style>
