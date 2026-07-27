<script lang="ts">
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Option from "@/modules/services/LiveSyncUI/components/Option.svelte";
    import Options from "@/modules/services/LiveSyncUI/components/Options.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import { TYPE_NEW_USER, TYPE_EXISTING_USER, TYPE_CANCELLED, type IntroResultType } from "./setupDialogTypes";
    import { $msg as translateMessage } from "@/common/translation";

    type Props = {
        setResult: (result: IntroResultType) => void;
    };
    const { setResult }: Props = $props();
    let userType = $state<IntroResultType>(TYPE_CANCELLED);
    let proceedTitle = $derived.by(() => {
        if (userType === TYPE_NEW_USER) {
            return translateMessage("Ui.SetupWizard.Intro.ProceedNew");
        } else if (userType === TYPE_EXISTING_USER) {
            return translateMessage("Ui.SetupWizard.Intro.ProceedExisting");
        } else {
            return translateMessage("Ui.SetupWizard.Common.ProceedSelectOption");
        }
    });
    const canProceed = $derived.by(() => {
        return userType === TYPE_NEW_USER || userType === TYPE_EXISTING_USER;
    });
</script>

<DialogHeader title={translateMessage("Ui.SetupWizard.Intro.Title")} />
<Guidance>{translateMessage("Ui.SetupWizard.Intro.Guidance")}</Guidance>
<InfoNote>
    {translateMessage(
        "This first setup has several short steps because it confirms encryption, the connection method, and which device provides the initial data. Once it is complete, additional devices can reuse a Setup URI."
    )}
</InfoNote>
<Instruction>
    <Question>{translateMessage("Ui.SetupWizard.Intro.Question")}</Question>
    <Options>
        <Option
            selectedValue={TYPE_NEW_USER}
            title={translateMessage("Ui.SetupWizard.Intro.NewOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.Intro.NewOptionDesc")}
        </Option>
        <Option
            selectedValue={TYPE_EXISTING_USER}
            title={translateMessage("Ui.SetupWizard.Intro.ExistingOption")}
            bind:value={userType}
        >
            {translateMessage("Ui.SetupWizard.Intro.ExistingOptionDesc")}
        </Option>
    </Options>
</Instruction>
<UserDecisions>
    <Decision title={proceedTitle} important={canProceed} disabled={!canProceed} commit={() => setResult(userType)} />
    <Decision title={translateMessage("Ui.SetupWizard.Common.Back")} commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
