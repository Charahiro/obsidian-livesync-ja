<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import Question from "@lib/UI/components/Question.svelte";
    import Instruction from "@lib/UI/components/Instruction.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import { TYPE_APPLY, TYPE_CANCELLED, type OutroNewUserResultType } from "./setupDialogTypes";
    type Props = {
        setResult: (result: OutroNewUserResultType) => void;
    };
    const { setResult }: Props = $props();
    // let userType = $state<OutroNewUserResultType>(TYPE_CANCELLED);
</script>

<DialogHeader title="セットアップ完了: サーバー初期化の準備" />
<Guidance>
    <p>
        サーバーへの接続設定が完了しました。次の手順では、<strong
            >このデバイス上の現在のデータを元に、サーバー上の同期データを構築します。</strong
        >
    </p>
    <p>
        <strong>重要</strong>
        <br />
        再起動後、このデバイス上のデータが「正本」としてサーバーへアップロードされます。現在サーバー上にある意図しないデータは完全に上書きされるため注意してください。
    </p>
</Guidance>
<Instruction>
    <Question>再起動して最終確認へ進むには、下のボタンを選択してください。</Question>
</Instruction>
<UserDecisions>
    <Decision title="再起動してサーバーを初期化" important={true} commit={() => setResult(TYPE_APPLY)} />
    <Decision title="いいえ、戻ります" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
