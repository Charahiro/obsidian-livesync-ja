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
        TYPE_CONFIGURE_MANUALLY,
        TYPE_CANCELLED,
        type SelectMethodNewUserResultType,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: SelectMethodNewUserResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<SelectMethodNewUserResultType>(TYPE_CANCELLED);
    let proceedTitle = $derived.by(() => {
        if (userType === TYPE_USE_SETUP_URI) {
            return "セットアップURIで続行";
        } else if (userType === TYPE_CONFIGURE_MANUALLY) {
            return "サーバー情報を手動で入力する";
        } else {
            return "続行するには選択してください";
        }
    });
    const canProceed = $derived.by(() => {
        return userType === TYPE_USE_SETUP_URI || userType === TYPE_CONFIGURE_MANUALLY;
    });
</script>

<DialogHeader title="接続方法" />
<Guidance>サーバー設定に進みます。</Guidance>
<Instruction>
    <Question>サーバーへの接続をどのように設定しますか？</Question>
    <Options>
        <Option selectedValue={TYPE_USE_SETUP_URI} title="セットアップURIを使用する（推奨）" bind:value={userType}>
            セットアップURIは、サーバーアドレスと認証情報を含む1つの文字列です。サーバーのインストールスクリプトで生成されている場合は、簡単かつ安全に設定できます。
        </Option>
        <Option
            selectedValue={TYPE_CONFIGURE_MANUALLY}
            title="サーバー情報を手動で入力する"
            bind:value={userType}
        >
            URIがない場合や、詳細な設定を自分で行いたい場合の上級者向けオプションです。CouchDB/S3サーバーではなく
            <strong>P2P（Peer-to-Peer）同期</strong>を使用する場合も、このオプションを選択できます。P2Pではサーバー設定は不要です。
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
