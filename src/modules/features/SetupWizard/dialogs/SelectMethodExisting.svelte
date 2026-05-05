<script lang="ts">
    import DialogHeader from "@/lib/src/UI/components/DialogHeader.svelte";
    import Guidance from "@/lib/src/UI/components/Guidance.svelte";
    import Decision from "@/lib/src/UI/components/Decision.svelte";
    import Question from "@/lib/src/UI/components/Question.svelte";
    import Option from "@/lib/src/UI/components/Option.svelte";
    import Options from "@/lib/src/UI/components/Options.svelte";
    import Instruction from "@/lib/src/UI/components/Instruction.svelte";
    import UserDecisions from "@/lib/src/UI/components/UserDecisions.svelte";
    import InfoNote from "@/lib/src/UI/components/InfoNote.svelte";
    import ExtraItems from "@/lib/src/UI/components/ExtraItems.svelte";
    import Check from "@/lib/src/UI/components/Check.svelte";
    const TYPE_USE_SETUP_URI = "use-setup-uri";
    const TYPE_SCAN_QR_CODE = "scan-qr-code";
    const TYPE_CONFIGURE_MANUALLY = "configure-manually";
    const TYPE_CANCELLED = "cancelled";
    type ResultType =
        | typeof TYPE_USE_SETUP_URI
        | typeof TYPE_SCAN_QR_CODE
        | typeof TYPE_CONFIGURE_MANUALLY
        | typeof TYPE_CANCELLED;
    type Props = {
        setResult: (result: ResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<ResultType>(TYPE_CANCELLED);
    let proceedTitle = $derived.by(() => {
        if (userType === TYPE_USE_SETUP_URI) {
            return "セットアップURIで続行";
        } else if (userType === TYPE_CONFIGURE_MANUALLY) {
            return "サーバー情報を手動で入力する";
        } else if (userType === TYPE_SCAN_QR_CODE) {
            return "このデバイスのカメラで、既存デバイスに表示されたQRコードをスキャンする";
        } else {
            return "続行するには選択してください";
        }
    });
    const canProceed = $derived.by(() => {
        return (
            userType === TYPE_USE_SETUP_URI ||
            userType === TYPE_CONFIGURE_MANUALLY ||
            userType === TYPE_SCAN_QR_CODE
        );
    });
</script>

<DialogHeader title="デバイスのセットアップ方法" />
<Guidance>このデバイスを既存の同期設定に追加します。</Guidance>
<Instruction>
    <Question>別のデバイスから設定を取り込む方法を選択してください。</Question>
    <Options>
        <Option selectedValue={TYPE_USE_SETUP_URI} title="セットアップURIを使用する（推奨）" bind:value={userType}>
            既に使用中のデバイスで生成したセットアップURIを貼り付けます。
        </Option>
        <Option
            selectedValue={TYPE_SCAN_QR_CODE}
            title="QRコードをスキャンする（モバイル向け推奨）"
            bind:value={userType}
        >
            このデバイスのカメラで、既に使用中のデバイスに表示されたQRコードをスキャンします。
        </Option>
        <Option
            selectedValue={TYPE_CONFIGURE_MANUALLY}
            title="サーバー情報を手動で入力する"
            bind:value={userType}
        >
            他のデバイスと同じサーバー情報を手動で再設定します。上級者向けです。
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
