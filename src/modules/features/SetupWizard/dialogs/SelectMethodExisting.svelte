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
        TYPE_SCAN_QR_CODE,
        TYPE_CONFIGURE_MANUALLY,
        TYPE_CANCELLED,
        type SelectMethodExistingResultType,
    } from "./setupDialogTypes";

    type Props = {
        setResult: (result: SelectMethodExistingResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<SelectMethodExistingResultType>(TYPE_CANCELLED);
    let proceedTitle = $derived.by(() => {
        if (userType === TYPE_USE_SETUP_URI) {
            return translateMessage("Ui.SetupWizard.SelectExisting.ProceedSetupUri");
        } else if (userType === TYPE_CONFIGURE_MANUALLY) {
            return translateMessage("Ui.SetupWizard.SelectExisting.ProceedManual");
        } else if (userType === TYPE_SCAN_QR_CODE) {
            return translateMessage("Ui.SetupWizard.SelectExisting.ProceedQr");
        } else {
            return translateMessage("Ui.SetupWizard.Common.ProceedSelectOption");
        }
    });
    const canProceed = $derived.by(() => {
        return userType === TYPE_USE_SETUP_URI || userType === TYPE_CONFIGURE_MANUALLY || userType === TYPE_SCAN_QR_CODE;
    });
</script>

<DialogHeader title={translateMessage("Ui.SetupWizard.SelectExisting.Title")} />
<Guidance>{translateMessage("Ui.SetupWizard.SelectExisting.Guidance")}</Guidance>
<Instruction>
    <Question>{translateMessage("Ui.SetupWizard.SelectExisting.Question")}</Question>
    <Options>
        <Option
            selectedValue={TYPE_USE_SETUP_URI}
            title={translateMessage("Ui.SetupWizard.SelectExisting.SetupUriOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.SelectExisting.SetupUriOptionDesc")}
        </Option>
        <Option
            selectedValue={TYPE_SCAN_QR_CODE}
            title={translateMessage("Ui.SetupWizard.SelectExisting.QrOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.SelectExisting.QrOptionDesc")}
        </Option>
        <Option
            selectedValue={TYPE_CONFIGURE_MANUALLY}
            title={translateMessage("Ui.SetupWizard.SelectExisting.ManualOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.SelectExisting.ManualOptionDesc")}
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title={translateMessage("Ui.SetupWizard.Common.Cancel")} commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
