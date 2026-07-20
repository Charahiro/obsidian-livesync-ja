<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import Instruction from "@lib/UI/components/Instruction.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import { TYPE_CLOSE, type ScanQRCodeResultType } from "./setupDialogTypes";

    type Props = {
        setResult: (_result: ScanQRCodeResultType) => void;
    };
    const { setResult }: Props = $props();
</script>

<DialogHeader title="QRコードをスキャン" />
<Guidance>既存のデバイスから設定を取り込むには、以下の手順に従ってください。</Guidance>
<Instruction>
    <!-- <Question>How would you like to configure the connection to your server?</Question> -->
    <ol>
        <li>このデバイスでは、このVaultを開いたままにしてください。</li>
        <li>取り込み元のデバイスでObsidianを開きます。</li>
        <li>取り込み元のデバイスで、コマンドパレットから「設定をQRコードとして表示」を実行します。</li>
        <li>このデバイスでカメラアプリまたはQRコードスキャナーに切り替え、表示されたQRコードをスキャンします。</li>
    </ol>
</Instruction>
<UserDecisions>
    <Decision title="このダイアログを閉じる" important={true} commit={() => setResult(TYPE_CLOSE)} />
</UserDecisions>
