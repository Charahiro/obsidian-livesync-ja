<script lang="ts">
    import { uiText } from "@/common/uiText";
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import Question from "@/modules/services/LiveSyncUI/components/Question.svelte";
    import Instruction from "@/modules/services/LiveSyncUI/components/Instruction.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import { $msg as translateMessage } from "@/common/translation";

    import { TYPE_CANCELLED, TYPE_APPLY, type OutroExistingUserResultType } from "./setupDialogTypes";
    type Props = {
        setResult: (result: OutroExistingUserResultType) => void;
        getInitialData?: () => { isP2P?: boolean } | undefined;
    };
    const { setResult, getInitialData }: Props = $props();
    const isP2P = $derived(getInitialData?.()?.isP2P === true);
</script>

{#if isP2P}
    <DialogHeader title={uiText("Setup Complete: Preparing to Fetch from Another Device", "設定完了：別のデバイスから取得する準備")} />
    <Guidance>
        <p>
            {uiText("The P2P connection has been configured successfully. The initial synchronisation data must now be fetched from an online source device.", "P2P接続を設定しました。オンラインの取得元デバイスから初期同期データを取得する必要があります。")}
        </p>
        <p>
            <strong>{translateMessage("PLEASE NOTE")}</strong>
            <br />
            {uiText("After restarting, select an online source device for the initial Fetch. The local LiveSync database on this device will be rebuilt from that source. Unsynchronised files in this Vault may conflict with the fetched data.", "再起動後、初回取得用にオンラインの取得元デバイスを選択してください。このデバイスのローカルデータベースは取得元から再構築されます。このVault内の未同期ファイルは、取得したデータと競合する場合があります。")}
        </p>
    </Guidance>
    <Instruction>
        <Question>
            {uiText("Restart this device, then choose the source device when P2P Rebuild opens.", "このデバイスを再起動し、P2P再構築画面が開いたら取得元デバイスを選択してください。")}
        </Question>
    </Instruction>
    <UserDecisions>
        <Decision
            title={uiText("Restart and Select Source Device", "再起動して取得元デバイスを選択")}
            important={true}
            commit={() => setResult(TYPE_APPLY)}
        />
        <Decision title={translateMessage("No, please take me back")} commit={() => setResult(TYPE_CANCELLED)} />
    </UserDecisions>
{:else}
    <DialogHeader title={translateMessage("Setup Complete: Preparing to Fetch Synchronisation Data")} />
    <Guidance>
        <p>
            {translateMessage("The connection to the server has been configured successfully. As the next step,")}
            <strong
                >{translateMessage(
                    "the latest synchronisation data will be downloaded from the server to this device."
                )}</strong
            >
        </p>
        <p>
            <strong>{translateMessage("PLEASE NOTE")}</strong>
            <br />
            {translateMessage(
                "After restarting, the database on this device will be rebuilt using data from the server. If there are any unsynchronised files in this vault, conflicts may occur with the server data."
            )}
        </p>
    </Guidance>
    <Instruction>
        <Question
            >{translateMessage(
                "Please select the button below to restart and proceed to the data fetching confirmation."
            )}</Question
        >
    </Instruction>
    <UserDecisions>
        <Decision
            title={translateMessage("Restart and Fetch Data")}
            important={true}
            commit={() => setResult(TYPE_APPLY)}
        />
        <Decision title={translateMessage("No, please take me back")} commit={() => setResult(TYPE_CANCELLED)} />
    </UserDecisions>
{/if}
