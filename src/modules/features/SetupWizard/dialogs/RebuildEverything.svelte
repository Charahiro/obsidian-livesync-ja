<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import Question from "@lib/UI/components/Question.svelte";
    import Option from "@lib/UI/components/Option.svelte";
    import Options from "@lib/UI/components/Options.svelte";
    import Instruction from "@lib/UI/components/Instruction.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import InfoNote from "@lib/UI/components/InfoNote.svelte";
    import ExtraItems from "@lib/UI/components/ExtraItems.svelte";
    import Check from "@lib/UI/components/Check.svelte";
    import {
        TYPE_CANCEL,
        TYPE_BACKUP_DONE,
        TYPE_BACKUP_SKIPPED,
        TYPE_UNABLE_TO_BACKUP,
        type RebuildEverythingResult,
        type ResultTypeBackup,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: RebuildEverythingResult) => void;
    };
    const { setResult }: Props = $props();

    let backupType = $state<ResultTypeBackup>(TYPE_CANCEL);
    let confirmationCheck1 = $state(false);
    let confirmationCheck2 = $state(false);
    let confirmationCheck3 = $state(false);
    const canProceed = $derived.by(() => {
        return (
            (backupType === TYPE_BACKUP_DONE || backupType === TYPE_BACKUP_SKIPPED) &&
            confirmationCheck1 &&
            confirmationCheck2 &&
            confirmationCheck3
        );
    });
    let preventFetchingConfig = $state(false);

    function commit() {
        setResult({
            backup: backupType,
            extra: {
                preventFetchingConfig,
            },
        });
    }
</script>

<DialogHeader title="最終確認: サーバーデータをこのデバイスのファイルで上書き" />
<Guidance
    >この手順では、まずサーバー上の既存の同期データをすべて削除します。その後、このデバイス上のVaultの現在の状態（ローカルデータベースを含む）を<strong>唯一の正本</strong>として、サーバーデータを完全に再構築します。</Guidance
>
<InfoNote>
    この操作は、サーバーデータが完全に破損している、他のすべてのデバイス上の変更が不要になった、Vaultサイズに比べてデータベースサイズが異常に大きくなった、などの例外的な場合にのみ実行してください。
</InfoNote>
<Guidance important title="⚠️ 以下を確認してください">
    <Check
        title="他のスマートフォンやパソコンで行ったすべての変更が失われる可能性があることを理解しました。"
        bind:value={confirmationCheck1}
    >
        <InfoNote>他のデバイス側で解決する方法はあります。</InfoNote>
        <InfoNote>もちろん、続行前にデータをバックアップできます。</InfoNote>
    </Check>
    <Check
        title="他のデバイスは同期できなくなり、同期情報のリセットが必要になることを理解しました。"
        bind:value={confirmationCheck2}
    >
        <InfoNote>リモートをリセットすると、他のデバイスにも通知されます。</InfoNote>
    </Check>
    <Check title="この操作は一度実行すると元に戻せないことを理解しました。" bind:value={confirmationCheck3} />
</Guidance>
<hr />
<Instruction>
    <Question>続行前にバックアップを作成しましたか？</Question>
    <InfoNote warning>
        これは非常に強力な操作です。Vaultフォルダーを安全な場所へコピーしておくことを強く推奨します。
    </InfoNote>
    <Options>
        <Option selectedValue={TYPE_BACKUP_DONE} title="Vaultのバックアップを作成しました。" bind:value={backupType} />
        <Option
            selectedValue={TYPE_BACKUP_SKIPPED}
            title="リスクを理解したうえで、バックアップなしで続行します。"
            bind:value={backupType}
        />
        <Option
            selectedValue={TYPE_UNABLE_TO_BACKUP}
            title="Vaultのバックアップを作成できません。"
            bind:value={backupType}
        >
            <InfoNote error visible={backupType === TYPE_UNABLE_TO_BACKUP}>
                <strong
                    >新しい同期先を作成し、そこへデータを再構築するべきです。<br />その後、他の各デバイスで新しいリモートを使い、新しいVaultへ1台ずつ同期してください。</strong
                >
            </InfoNote>
        </Option>
    </Options>
</Instruction>
<Instruction>
    <ExtraItems title="詳細設定">
        <Check title="サーバーから設定を取得しない" bind:value={preventFetchingConfig} />
    </ExtraItems>
</Instruction>
<UserDecisions>
    <Decision title="理解しました。サーバーを上書きします" important disabled={!canProceed} commit={() => commit()} />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCEL)} />
</UserDecisions>
