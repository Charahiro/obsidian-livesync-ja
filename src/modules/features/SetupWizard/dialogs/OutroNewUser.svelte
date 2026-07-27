<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import { $msg as msg } from "@/common/translation";
    import { TYPE_APPLY, TYPE_CANCELLED, type OutroNewUserResultType } from "./setupDialogTypes";

    type Props = {
        setResult: (result: OutroNewUserResultType) => void;
        getInitialData?: () => { isP2P?: boolean } | undefined;
    };
    const { setResult, getInitialData }: Props = $props();
    const isP2P = $derived(getInitialData?.()?.isP2P === true);
    // let userType = $state<OutroNewUserResultType>(TYPE_CANCELLED);
</script>

{#if isP2P}
    <DialogHeader title={msg("Ui.SetupWizard.OutroNewP2PUser.Title")} />
    <Guidance>
        <p>{msg("Ui.SetupWizard.OutroNewP2PUser.GuidancePrimary")}</p>
        <p>
            <strong>{msg("Ui.SetupWizard.OutroNewP2PUser.Important")}</strong>
            <br />
            {msg("Ui.SetupWizard.OutroNewP2PUser.GuidanceNotice")}
        </p>
    </Guidance>
    <Instruction>
        <Question>{msg("Ui.SetupWizard.OutroNewP2PUser.Question")}</Question>
    </Instruction>
    <UserDecisions>
        <Decision
            title={msg("Ui.SetupWizard.OutroNewP2PUser.Proceed")}
            important={true}
            commit={() => setResult(TYPE_APPLY)}
        />
        <Decision title={msg("Ui.SetupWizard.Common.Back")} commit={() => setResult(TYPE_CANCELLED)} />
    </UserDecisions>
{:else}
    <DialogHeader title={msg("Ui.SetupWizard.OutroNewUser.Title")} />
    <Guidance>
        <p>{msg("Ui.SetupWizard.OutroNewUser.GuidancePrimary")}</p>
        <p>
            <strong>{msg("Ui.SetupWizard.OutroNewUser.Important")}</strong>
            <br />
            {msg("Ui.SetupWizard.OutroNewUser.GuidanceWarning")}
        </p>
    </Guidance>
    <Instruction>
        <Question>{msg("Ui.SetupWizard.OutroNewUser.Question")}</Question>
    </Instruction>
    <UserDecisions>
        <Decision title={msg("Ui.SetupWizard.OutroNewUser.Proceed")} important={true} commit={() => setResult(TYPE_APPLY)} />
        <Decision title={msg("Ui.SetupWizard.Common.Back")} commit={() => setResult(TYPE_CANCELLED)} />
    </UserDecisions>
{/if}
