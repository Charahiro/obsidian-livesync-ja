<script lang="ts">
    import DialogHeader from "@/lib/src/UI/components/DialogHeader.svelte";
    import Decision from "@/lib/src/UI/components/Decision.svelte";
    import Question from "@/lib/src/UI/components/Question.svelte";
    import Option from "@/lib/src/UI/components/Option.svelte";
    import Options from "@/lib/src/UI/components/Options.svelte";
    import Instruction from "@/lib/src/UI/components/Instruction.svelte";
    import UserDecisions from "@/lib/src/UI/components/UserDecisions.svelte";
    const TYPE_COUCHDB = "couchdb";
    const TYPE_BUCKET = "bucket";
    const TYPE_P2P = "p2p";
    const TYPE_CANCELLED = "cancelled";
    type ResultType = typeof TYPE_COUCHDB | typeof TYPE_BUCKET | typeof TYPE_P2P | typeof TYPE_CANCELLED;
    type Props = {
        setResult: (result: ResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<ResultType>(TYPE_CANCELLED);
    let proceedTitle = $derived.by(() => {
        if (userType === TYPE_COUCHDB) {
            return "CouchDB設定へ進む";
        } else if (userType === TYPE_BUCKET) {
            return "S3/MinIO/R2設定へ進む";
        } else if (userType === TYPE_P2P) {
            return "Peer-to-Peer専用設定へ進む";
        } else {
            return "続行するには選択してください";
        }
    });
    const canProceed = $derived.by(() => {
        return userType === TYPE_COUCHDB || userType === TYPE_BUCKET || userType === TYPE_P2P;
    });
</script>

<DialogHeader title="サーバー情報の入力" />
<Instruction>
    <Question>接続先サーバーの種類を選択してください。</Question>
    <Options>
        <Option selectedValue={TYPE_COUCHDB} title="CouchDB" bind:value={userType}>
            設計上、最も適した同期方式です。すべての機能を利用できます。CouchDBインスタンスをセットアップしておく必要があります。
        </Option>
        <Option selectedValue={TYPE_BUCKET} title="S3/MinIO/R2オブジェクトストレージ" bind:value={userType}>
            ジャーナルファイルを利用した同期です。S3/MinIO/R2互換のオブジェクトストレージをセットアップしておく必要があります。
        </Option>
        <Option selectedValue={TYPE_P2P} title="Peer-to-Peerのみ" bind:value={userType}>
            デバイス間で直接同期します。サーバーは不要ですが、同期時には両方のデバイスが同時にオンラインである必要があり、一部機能は制限される場合があります。インターネット接続はシグナリング（ピア検出）にのみ必要で、データ転送には使用されません。
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title="いいえ、戻ります" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
