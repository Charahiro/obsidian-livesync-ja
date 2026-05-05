<script lang="ts">
    import DialogHeader from "@/lib/src/UI/components/DialogHeader.svelte";
    import Guidance from "@/lib/src/UI/components/Guidance.svelte";
    import Decision from "@/lib/src/UI/components/Decision.svelte";
    import Question from "@/lib/src/UI/components/Question.svelte";
    import Instruction from "@/lib/src/UI/components/Instruction.svelte";
    import UserDecisions from "@/lib/src/UI/components/UserDecisions.svelte";
    const TYPE_APPLY = "apply";
    const TYPE_CANCELLED = "cancelled";
    type ResultType = typeof TYPE_APPLY | typeof TYPE_CANCELLED;
    type Props = {
        setResult: (result: ResultType) => void;
    };
    const { setResult }: Props = $props();
</script>

<DialogHeader title="セットアップ完了: 同期データ取得の準備" />
<Guidance>
    <p>
        サーバーへの接続設定が完了しました。次の手順では、<strong
            >サーバーからこのデバイスへ最新の同期データをダウンロードします。</strong
        >
    </p>
    <p>
        <strong>注意</strong>
        <br />
        再起動後、このデバイスのデータベースはサーバー上のデータを使って再構築されます。このVaultに未同期のファイルがある場合、サーバーデータとの競合が発生する可能性があります。
    </p>
</Guidance>
<Instruction>
    <Question>再起動してデータ取得の確認へ進むには、下のボタンを選択してください。</Question>
</Instruction>
<UserDecisions>
    <Decision title="再起動してデータを取得" important={true} commit={() => setResult(TYPE_APPLY)} />
    <Decision title="いいえ、戻ります" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
