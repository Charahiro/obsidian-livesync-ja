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
    const TYPE_CONFIGURE_MANUALLY = "configure-manually";
    const TYPE_CANCELLED = "cancelled";
    type ResultType = typeof TYPE_USE_SETUP_URI | typeof TYPE_CONFIGURE_MANUALLY | typeof TYPE_CANCELLED;
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
            URIがない場合や、詳細な設定を自分で行いたい場合の上級者向けオプションです。
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
