<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import Question from "@lib/UI/components/Question.svelte";
    import Option from "@lib/UI/components/Option.svelte";
    import Options from "@lib/UI/components/Options.svelte";
    import Instruction from "@lib/UI/components/Instruction.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import { TYPE_NEW_USER, TYPE_EXISTING_USER, TYPE_CANCELLED, type IntroResultType } from "./setupDialogTypes";

    type Props = {
        setResult: (result: IntroResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<IntroResultType>(TYPE_CANCELLED);
    let proceedTitle = $derived.by(() => {
        if (userType === TYPE_NEW_USER) {
            return "はい、新しい同期をセットアップします";
        } else if (userType === TYPE_EXISTING_USER) {
            return "はい、このデバイスを既存の同期に追加します";
        } else {
            return "続行するには選択してください";
        }
    });
    const canProceed = $derived.by(() => {
        return userType === TYPE_NEW_USER || userType === TYPE_EXISTING_USER;
    });
</script>

<DialogHeader title="Self-hosted LiveSync へようこそ" />
<Guidance>同期設定を簡単に行うため、いくつかの質問に沿って案内します。</Guidance>
<Instruction>
    <Question>まず、現在の状況に最も近いものを選択してください。</Question>
    <Options>
        <Option selectedValue={TYPE_NEW_USER} title="初めてセットアップします" bind:value={userType}>
            このデバイスを最初の同期デバイスとして設定する場合に選択してください。LiveSyncを初めて使い、最初から設定する場合に適しています。
        </Option>
        <Option
            selectedValue={TYPE_EXISTING_USER}
            title="既存の同期設定にこのデバイスを追加します"
            bind:value={userType}
        >
            別のパソコンやスマートフォンで既に同期を使用している場合に選択してください。このデバイスを既存の同期環境に参加させます。
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title="いいえ、戻ります" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
