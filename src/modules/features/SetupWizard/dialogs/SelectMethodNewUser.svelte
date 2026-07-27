<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Option from "@/modules/services/LiveSyncUI/components/Option.svelte";
    import Options from "@/modules/services/LiveSyncUI/components/Options.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import { $msg as translateMessage } from "@/common/translation";
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
            return translateMessage("Ui.SetupWizard.SelectNew.ProceedSetupUri");
        } else if (userType === TYPE_CONFIGURE_MANUALLY) {
            return translateMessage("Ui.SetupWizard.SelectNew.ProceedManual");
        } else {
            return translateMessage("Ui.SetupWizard.Common.ProceedSelectOption");
        }
    });
    const canProceed = $derived.by(() => {
        return userType === TYPE_USE_SETUP_URI || userType === TYPE_CONFIGURE_MANUALLY;
    });
</script>

<DialogHeader title={translateMessage("Ui.SetupWizard.SelectNew.Title")} />
<Guidance>{translateMessage("Ui.SetupWizard.SelectNew.Guidance")}</Guidance>
<Instruction>
    <Question>{translateMessage("Ui.SetupWizard.SelectNew.Question")}</Question>
    <Options>
        <Option
            selectedValue={TYPE_USE_SETUP_URI}
            title={translateMessage("Ui.SetupWizard.SelectNew.SetupUriOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.SelectNew.SetupUriOptionDesc")}
        </Option>
        <Option
            selectedValue={TYPE_CONFIGURE_MANUALLY}
            title={translateMessage("Ui.SetupWizard.SelectNew.ManualOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.SelectNew.ManualOptionDesc")}
            {translateMessage(
                "P2P requires no central data-storage server, but it still uses a signalling relay for peer discovery."
            )}
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title={translateMessage("Ui.SetupWizard.Common.Cancel")} commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
