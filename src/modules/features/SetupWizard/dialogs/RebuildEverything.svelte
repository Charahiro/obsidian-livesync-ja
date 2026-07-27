<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Option from "@/modules/services/LiveSyncUI/components/Option.svelte";
    import Options from "@/modules/services/LiveSyncUI/components/Options.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import ExtraItems from "@/modules/services/LiveSyncUI/components/ExtraItems.svelte";
    import Check from "@/modules/services/LiveSyncUI/components/Check.svelte";
    import { $msg as msg } from "@/common/translation";
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
        getInitialData?: () => { isP2P?: boolean } | undefined;
    };
    const { setResult, getInitialData }: Props = $props();
    const isP2P = $derived(getInitialData?.()?.isP2P === true);

    let backupType = $state<ResultTypeBackup>(TYPE_CANCEL);
    let confirmationCheck1 = $state(false);
    let confirmationCheck2 = $state(false);
    let confirmationCheck3 = $state(false);
    const canProceed = $derived.by(() => {
        const backupConfirmed = backupType === TYPE_BACKUP_DONE || backupType === TYPE_BACKUP_SKIPPED;
        if (isP2P) return backupConfirmed && confirmationCheck1;
        return backupConfirmed && confirmationCheck1 && confirmationCheck2 && confirmationCheck3;
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

{#if isP2P}
    <DialogHeader title={msg("Ui.SetupWizard.RebuildEverythingP2P.Title")} />
    <Guidance>{msg("Ui.SetupWizard.RebuildEverythingP2P.Guidance")}</Guidance>
    <InfoNote>{msg("Ui.SetupWizard.RebuildEverythingP2P.Note")}</InfoNote>
    <Guidance important title={msg("Ui.SetupWizard.RebuildEverythingP2P.ConfirmTitle")}>
        <Check title={msg("Ui.SetupWizard.RebuildEverythingP2P.ConfirmLocalReset")} bind:value={confirmationCheck1}>
            <InfoNote>{msg("Ui.SetupWizard.RebuildEverythingP2P.ConfirmLocalResetNote")}</InfoNote>
        </Check>
    </Guidance>
{:else}
    <DialogHeader title={msg("Ui.SetupWizard.RebuildEverything.Title")} />
    <Guidance>{msg("Ui.SetupWizard.RebuildEverything.Guidance")}</Guidance>
    <InfoNote>{msg("Ui.SetupWizard.RebuildEverything.Note")}</InfoNote>
    <Guidance important title={msg("Ui.SetupWizard.RebuildEverything.ConfirmTitle")}>
        <Check
            title={msg("Ui.SetupWizard.RebuildEverything.ConfirmOtherChanges")}
            bind:value={confirmationCheck1}
        >
            <InfoNote>{msg("Ui.SetupWizard.RebuildEverything.ConfirmOtherChangesNote")}</InfoNote>
        </Check>
        <Check
            title={msg("Ui.SetupWizard.RebuildEverything.ConfirmOtherDevices")}
            bind:value={confirmationCheck2}
        >
            <InfoNote>{msg("Ui.SetupWizard.RebuildEverything.ConfirmOtherDevicesNote")}</InfoNote>
        </Check>
        <Check title={msg("Ui.SetupWizard.RebuildEverything.ConfirmIrreversible")} bind:value={confirmationCheck3} />
    </Guidance>
{/if}
<hr />
<Instruction>
    <Question>{msg("Ui.SetupWizard.RebuildEverything.BackupQuestion")}</Question>
    <InfoNote warning>{msg("Ui.SetupWizard.RebuildEverything.BackupWarning")}</InfoNote>
    <Options>
        <Option
            selectedValue={TYPE_BACKUP_DONE}
            title={msg("Ui.SetupWizard.RebuildEverything.BackupDone")}
            bind:value={backupType}
        />
        <Option
            selectedValue={TYPE_BACKUP_SKIPPED}
            title={msg("Ui.SetupWizard.RebuildEverything.BackupSkipped")}
            bind:value={backupType}
        />
        <Option
            selectedValue={TYPE_UNABLE_TO_BACKUP}
            title={msg("Ui.SetupWizard.RebuildEverything.BackupUnable")}
            bind:value={backupType}
        >
            <InfoNote error visible={backupType === TYPE_UNABLE_TO_BACKUP}>
                <strong>{msg("Ui.SetupWizard.RebuildEverything.BackupUnableNote")}</strong>
            </InfoNote>
        </Option>
    </Options>
</Instruction>
{#if !isP2P}
    <Instruction>
        <ExtraItems title={msg("Ui.SetupWizard.RebuildEverything.Advanced")}>
            <Check title={msg("Ui.SetupWizard.RebuildEverything.PreventFetchingConfig")} bind:value={preventFetchingConfig} />
        </ExtraItems>
    </Instruction>
{/if}
<UserDecisions>
    <Decision
        title={isP2P ? msg("Ui.SetupWizard.RebuildEverythingP2P.Proceed") : msg("Ui.SetupWizard.RebuildEverything.Proceed")}
        important
        disabled={!canProceed}
        commit={() => commit()}
    />
    <Decision title={msg("Ui.SetupWizard.Common.Cancel")} commit={() => setResult(TYPE_CANCEL)} />
</UserDecisions>
