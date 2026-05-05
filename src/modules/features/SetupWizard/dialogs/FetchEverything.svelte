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
    const TYPE_IDENTICAL = "identical";
    const TYPE_INDEPENDENT = "independent";
    const TYPE_UNBALANCED = "unbalanced";
    const TYPE_CANCEL = "cancelled";

    const TYPE_BACKUP_DONE = "backup_done";
    const TYPE_BACKUP_SKIPPED = "backup_skipped";
    const TYPE_UNABLE_TO_BACKUP = "unable_to_backup";

    type ResultTypeVault =
        | typeof TYPE_IDENTICAL
        | typeof TYPE_INDEPENDENT
        | typeof TYPE_UNBALANCED
        | typeof TYPE_CANCEL;
    type ResultTypeBackup =
        | typeof TYPE_BACKUP_DONE
        | typeof TYPE_BACKUP_SKIPPED
        | typeof TYPE_UNABLE_TO_BACKUP
        | typeof TYPE_CANCEL;

    type ResultTypeExtra = {
        preventFetchingConfig: boolean;
    };
    type ResultType =
        | {
              vault: ResultTypeVault;
              backup: ResultTypeBackup;
              extra: ResultTypeExtra;
          }
        | typeof TYPE_CANCEL;
    type Props = {
        setResult: (result: ResultType) => void;
    };
    const { setResult }: Props = $props();
    let vaultType = $state<ResultTypeVault>(TYPE_CANCEL);
    let backupType = $state<ResultTypeBackup>(TYPE_CANCEL);
    const canProceed = $derived.by(() => {
        return (
            (vaultType === TYPE_IDENTICAL || vaultType === TYPE_INDEPENDENT || vaultType === TYPE_UNBALANCED) &&
            (backupType === TYPE_BACKUP_DONE || backupType === TYPE_BACKUP_SKIPPED)
        );
    });
    let preventFetchingConfig = $state(false);

    function commit() {
        setResult({
            vault: vaultType,
            backup: backupType,
            extra: {
                preventFetchingConfig,
            },
        });
    }
</script>

<DialogHeader title="このデバイスの同期をリセット" />
<Guidance
    >サーバー上の最新データを使って、このデバイスのローカルデータベースを再構築します。この操作は同期の不整合を解消し、正しい動作を復旧するためのものです。</Guidance
>
<Guidance important title="⚠️ 重要なお知らせ">
    <strong
        >このデバイスのVaultに未同期の変更がある場合、リセット後にサーバー上のバージョンと食い違う可能性があります。その結果、大量のファイル競合が発生することがあります。</strong
    ><br />
    また、サーバーデータに既に競合がある場合、それらはそのままこのデバイスへ同期されるため、ローカルで解決する必要があります。
</Guidance>
<hr />
<Instruction>
    <Question
        ><strong>新しい競合の発生を最小限に抑えるため</strong>、現在のVaultの状態に最も近いものを選択してください。選択内容に基づいて、最も適切な方法でファイルを確認します。</Question
    >
    <Options>
        <Option
            selectedValue={TYPE_IDENTICAL}
            title="このVaultのファイルはサーバー上のものとほぼ同一です。"
            bind:value={vaultType}
        >
            （例: 別のパソコンで復元した直後、またはバックアップから復旧した直後）
        </Option>
        <Option
            selectedValue={TYPE_INDEPENDENT}
            title="このVaultは空、またはサーバーに存在しない新規ファイルのみを含んでいます。"
            bind:value={vaultType}
        >
            （例: 新しいスマートフォンで初めて設定する、まっさらな状態から始める）
        </Option>
        <Option
            selectedValue={TYPE_UNBALANCED}
            title="このVaultとサーバー上のファイルに差異がある可能性があります。"
            bind:value={vaultType}
        >
            （例: オフライン中に多くのファイルを編集した後）
            <InfoNote info>
                この場合、Self-hosted LiveSyncはすべてのファイルのメタデータを再作成し、意図的に競合を生成します。ファイル内容が同一であれば、それらの競合は自動的に解決されます。
            </InfoNote>
        </Option>
    </Options>
</Instruction>
<hr />
<Instruction>
    <Question>続行前にバックアップを作成しましたか？</Question>
    <InfoNote>
        Vaultフォルダーを安全な場所へコピーしておくことを推奨します。大量の競合が発生した場合や、誤った同期先と同期してしまった場合の保険になります。
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
                    >続行前にバックアップを作成することを強く推奨します。バックアップなしで続行すると、データ損失につながる可能性があります。
                </strong>
                <br />
                リスクを理解したうえで続行する場合は、その選択肢を選んでください。
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
    <Decision title="リセットして同期を再開" important disabled={!canProceed} commit={() => commit()} />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCEL)} />
</UserDecisions>
