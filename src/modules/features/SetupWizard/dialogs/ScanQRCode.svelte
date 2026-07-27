<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
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
