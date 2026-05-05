<script lang="ts">
    import { configURIBase } from "../../../../common/types";
    import type { ObsidianLiveSyncSettings } from "../../../../lib/src/common/types";
    import DialogHeader from "@/lib/src/UI/components/DialogHeader.svelte";
    import Guidance from "@/lib/src/UI/components/Guidance.svelte";
    import Decision from "@/lib/src/UI/components/Decision.svelte";
    import UserDecisions from "@/lib/src/UI/components/UserDecisions.svelte";
    import InfoNote from "@/lib/src/UI/components/InfoNote.svelte";
    import InputRow from "@/lib/src/UI/components/InputRow.svelte";
    import Password from "@/lib/src/UI/components/Password.svelte";

    import { onMount } from "svelte";
    import { decryptString } from "../../../../lib/src/encryption/stringEncryption.ts";
    import type { GuestDialogProps } from "../../../../lib/src/UI/svelteDialog.ts";
    const TYPE_CANCELLED = "cancelled";
    type ResultType = typeof TYPE_CANCELLED | ObsidianLiveSyncSettings;
    type Props = GuestDialogProps<ResultType, string>;
    const { setResult, getInitialData }: Props = $props();

    let setupURI = $state("");
    let passphrase = $state("");
    let error = $state("");
    onMount(() => {
        if (getInitialData) {
            const initialURI = getInitialData();
            if (initialURI) {
                setupURI = initialURI;
            }
        }
    });

    const seemsValid = $derived.by(() => setupURI.startsWith(configURIBase));
    async function processSetupURI() {
        error = "";
        if (!seemsValid) return;
        if (!passphrase) {
            error = "パスフレーズが必要です。";
            return;
        }
        try {
            const settingPieces = setupURI.substring(configURIBase.length);
            const encodedConfig = decodeURIComponent(settingPieces);
            const newConf = (await JSON.parse(
                await decryptString(encodedConfig, passphrase)
            )) as ObsidianLiveSyncSettings;
            setResult(newConf);
            // Logger("Settings imported successfully", LOG_LEVEL_NOTICE);
            return;
        } catch (e) {
            error = "セットアップURIを解析できませんでした。";
            return;
        }
    }
    async function canProceed() {
        return (await processSetupURI()) ?? false;
    }
</script>

<DialogHeader title="セットアップURIの入力" />
<Guidance
    >サーバーのインストール時、または別のデバイスで生成したセットアップURIと、Vaultのパスフレーズを入力してください。<br />
    コマンドパレットから「設定を新しいセットアップURIとしてコピー」を実行すると、新しいセットアップURIを生成できます。</Guidance
>

<InputRow label="セットアップURI">
    <input
        type="text"
        placeholder="obsidian://setuplivesync?settings=...."
        bind:value={setupURI}
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
    />
</InputRow>
<InfoNote visible={seemsValid}>セットアップURIは有効で、使用できます。</InfoNote>
<InfoNote warning visible={!seemsValid && setupURI.trim() != ""}>
    セットアップURIが有効ではないようです。正しくコピーされているか確認してください。
</InfoNote>
<InputRow label="パスフレーズ">
    <Password placeholder="パスフレーズを入力" bind:value={passphrase} required />
</InputRow>
<InfoNote error visible={error.trim() != ""}>
    {error}
</InfoNote>

<UserDecisions>
    <Decision
        title="設定をテストして続行"
        important={true}
        disabled={!canProceed}
        commit={() => processSetupURI()}
    />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
