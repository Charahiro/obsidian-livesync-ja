<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import Question from "@lib/UI/components/Question.svelte";
    import Option from "@lib/UI/components/Option.svelte";
    import Options from "@lib/UI/components/Options.svelte";
    import Instruction from "@lib/UI/components/Instruction.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import {
        TYPE_USE_SETUP_URI,
        TYPE_SCAN_QR_CODE,
        TYPE_CONFIGURE_MANUALLY,
        TYPE_CANCELLED,
        type SelectMethodExistingResultType,
    } from "./setupDialogTypes";
    type Props = {
        setResult: (result: SelectMethodExistingResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<SelectMethodExistingResultType>(TYPE_CANCELLED);
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
