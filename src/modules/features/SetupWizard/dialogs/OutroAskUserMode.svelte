<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import Question from "@lib/UI/components/Question.svelte";
    import Option from "@lib/UI/components/Option.svelte";
    import Instruction from "@lib/UI/components/Instruction.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import InfoNote from "@lib/UI/components/InfoNote.svelte";
    import {
        type OutroAskUserModeResultType,
        TYPE_CANCELLED,
        TYPE_EXISTING,
        TYPE_NEW,
        TYPE_COMPATIBLE_EXISTING,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: OutroAskUserModeResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<OutroAskUserModeResultType>(TYPE_CANCELLED);
    const canProceed = $derived.by(() => {
        return userType === TYPE_EXISTING || userType === TYPE_NEW || userType === TYPE_COMPATIBLE_EXISTING;
    });
    const proceedMessage = $derived.by(() => {
        if (userType === TYPE_NEW) {
            return "次のステップへ進む";
        } else if (userType === TYPE_EXISTING) {
            return "次のステップへ進む";
        } else if (userType === TYPE_COMPATIBLE_EXISTING) {
            return "設定を適用";
        } else {
            return "続行するには選択してください";
        }
    });
</script>

<DialogHeader title="ほぼ完了: 判断が必要です" />
<Guidance>
    サーバーへの接続設定が完了しました。次の手順では、<strong
        >ローカルデータベース、つまり同期情報を再構成する必要があります。</strong
    >
</Guidance>
<Instruction>
    <Question>現在の状況を選択してください。</Question>
    <Option
        title="新しいサーバーを初めてセットアップする / 既存サーバーをリセットしたい"
        bind:value={userType}
        selectedValue={TYPE_NEW}
    >
        <InfoNote>
            このオプションを選択すると、このデバイス上の現在のデータを使ってサーバーを初期化します。サーバー上の既存データは完全に上書きされます。
        </InfoNote>
    </Option>
    <Option
        title="リモートサーバーは既にセットアップ済みで、このデバイスを参加させたい"
        bind:value={userType}
        selectedValue={TYPE_EXISTING}
    >
        <InfoNote>
            このオプションを選択すると、このデバイスを既存サーバーに参加させます。サーバーからこのデバイスへ既存の同期データを取得する必要があります。
        </InfoNote>
    </Option>
    <Option
        title="リモートは既にセットアップ済みで、構成に互換性がある（またはこの操作で互換性が得られた）"
        bind:value={userType}
        selectedValue={TYPE_COMPATIBLE_EXISTING}
    >
        <InfoNote warning>
            確信がない場合、この選択は少し危険です。サーバー構成がこのデバイスと互換性を持つことを前提にします。そうでない場合、データ損失が発生する可能性があります。内容を理解している場合のみ選択してください。
        </InfoNote>
    </Option>
</Instruction>
<UserDecisions>
    <Decision title={proceedMessage} important={true} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title="いいえ、戻ります" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
