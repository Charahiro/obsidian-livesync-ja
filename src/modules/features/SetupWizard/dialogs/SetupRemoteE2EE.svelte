<script lang="ts">
    import { uiText } from "@/common/uiText";
    import DialogHeader from "@/modules/services/LiveSyncUI/components/DialogHeader.svelte";
    import Guidance from "@/modules/services/LiveSyncUI/components/Guidance.svelte";
    import Decision from "@/modules/services/LiveSyncUI/components/Decision.svelte";
    import UserDecisions from "@/modules/services/LiveSyncUI/components/UserDecisions.svelte";
    import InfoNote from "@/modules/services/LiveSyncUI/components/InfoNote.svelte";
    import ExtraItems from "@/modules/services/LiveSyncUI/components/ExtraItems.svelte";
    import InputRow from "@/modules/services/LiveSyncUI/components/InputRow.svelte";
    import Password from "@/modules/services/LiveSyncUI/components/Password.svelte";
    import {
        DEFAULT_SETTINGS,
        E2EEAlgorithmNames,
        E2EEAlgorithms,
        type EncryptionSettings,
    } from "@vrtmrz/livesync-commonlib/compat/common/types";
    import {
        deriveIdKey,
        deriveOrImportIdKey,
        formatIdRecoveryCode,
        ID_DERIVATION_VERSION,
        ID_RECOVERY_CODE_PREFIX,
    } from "@vrtmrz/livesync-commonlib/settings";
    import { onMount } from "svelte";
    import type { GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { copyTo, pickEncryptionSettings } from "@vrtmrz/livesync-commonlib/compat/common/utils";
    import {
        TYPE_CANCELLED,
        type SetupRemoteE2EEInitialData,
        type SetupRemoteE2EEResultType,
    } from "./setupDialogTypes";
    import { $msg as translateMessage } from "@/common/translation";

    type Props = GuestDialogProps<SetupRemoteE2EEResultType, SetupRemoteE2EEInitialData>;
    type IdConfigurationChoice = "keep" | "random" | "custom";
    type IdCustomChoice = "passphrase" | "source" | "recovery";
    const { setResult, getInitialData }: Props = $props();
    let default_encryption: EncryptionSettings = {
        encrypt: true,
        passphrase: "",
        E2EEAlgorithm: DEFAULT_SETTINGS.E2EEAlgorithm,
        usePathObfuscation: true,
        encryptInternalMetadata: true,
        idDerivationVersion: 0,
        idDerivationKey: "",
    };

    let encryptionSettings = $state<EncryptionSettings>({ ...default_encryption });
    let newVault = $state(false);
    let idConfigurationChoice = $state<IdConfigurationChoice>("keep");
    let idCustomChoice = $state<IdCustomChoice>("source");
    let idDerivationSource = $state("");
    let idDerivationError = $state("");
    let recoveryCodeVisible = $state(false);
    let recoveryCodeCopied = $state(false);

    const idDerivationConfigured = $derived(
        encryptionSettings.idDerivationVersion === ID_DERIVATION_VERSION &&
            typeof encryptionSettings.idDerivationKey === "string" &&
            encryptionSettings.idDerivationKey.length > 0
    );
    const recoveryCode = $derived.by(() =>
        idDerivationConfigured ? formatIdRecoveryCode(encryptionSettings.idDerivationKey) : ""
    );

    onMount(() => {
        if (getInitialData) {
            const initialData = getInitialData();
            if (initialData) {
                copyTo(initialData.settings, encryptionSettings);
                newVault = initialData.newVault;
            }
        }
        idConfigurationChoice = !idDerivationConfigured && newVault ? "random" : "keep";
    });
    let e2eeValid = $derived.by(() => {
        if (!encryptionSettings.encrypt) return true;
        return encryptionSettings.passphrase.trim().length >= 1;
    });
    let canEncryptInternalMetadata = $derived(
        encryptionSettings.encrypt &&
            encryptionSettings.E2EEAlgorithm === E2EEAlgorithms.V2 &&
            encryptionSettings.usePathObfuscation
    );

    function resetIdDerivationSource() {
        idDerivationSource = "";
        idDerivationError = "";
    }

    function toggleEncryption(enabled: boolean) {
        encryptionSettings.encrypt = enabled;
        if (!enabled) resetIdDerivationSource();
    }

    function selectIdConfiguration() {
        recoveryCodeVisible = false;
        recoveryCodeCopied = false;
        resetIdDerivationSource();
    }

    function selectIdCustomSource() {
        resetIdDerivationSource();
    }

    async function copyRecoveryCode() {
        try {
            await navigator.clipboard.writeText(recoveryCode);
            recoveryCodeCopied = true;
        } catch {
            idDerivationError = uiText("The recovery code could not be copied. Select and copy the visible code instead.", "復元コードをコピーできませんでした。表示されているコードを選択してコピーしてください。");
        }
    }

    async function commit() {
        idDerivationError = "";
        const result = pickEncryptionSettings(encryptionSettings);

        if (encryptionSettings.encrypt && idConfigurationChoice !== "keep") {
            let source = idDerivationSource;
            if (idConfigurationChoice === "random") {
                const bytes = crypto.getRandomValues(new Uint8Array(32));
                source = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
            } else if (idCustomChoice === "passphrase") {
                source = encryptionSettings.passphrase;
            }
            if (source.length === 0) {
                if (!idDerivationConfigured) {
                    idDerivationError = uiText("An ID source is required to enable this option.", "この設定を有効にするにはIDキーの生成元が必要です。");
                    return;
                }
            } else {
                try {
                    result.idDerivationKey =
                        idConfigurationChoice === "custom" && idCustomChoice !== "passphrase"
                            ? await importOrDeriveEnteredIdKey(source, idCustomChoice)
                            : await deriveIdKey(source);
                    result.idDerivationVersion = ID_DERIVATION_VERSION;
                } catch {
                    idDerivationError = uiText("The ID source or recovery code is invalid. Check it and try again.", "IDキーの生成元または復元コードが不正です。確認して再試行してください。");
                    return;
                }
            }
        }

        idDerivationSource = "";
        setResult(result);
    }

    async function importOrDeriveEnteredIdKey(source: string, choice: IdCustomChoice): Promise<string> {
        if (choice === "recovery" && !source.trim().startsWith(ID_RECOVERY_CODE_PREFIX)) {
            throw new Error("An ID recovery code is required.");
        }
        return await deriveOrImportIdKey(source);
    }
</script>

<div class="sls-e2ee-dialog">
    <DialogHeader title={translateMessage("End-to-End Encryption")} />
    <Guidance>{translateMessage("Please configure your end-to-end encryption settings.")}</Guidance>
    <InputRow label={translateMessage("End-to-End Encryption")}>
        <input
            type="checkbox"
            checked={encryptionSettings.encrypt}
            onchange={(event) => toggleEncryption(event.currentTarget.checked)}
        />
    </InputRow>
    <InfoNote title={translateMessage("Strongly Recommended")}>
        {translateMessage(
            "Enabling end-to-end encryption ensures that your data is encrypted on your device before being sent to the remote server. This means that even if someone gains access to the server, they won't be able to read your data without the passphrase. Make sure to remember your passphrase, as it will be required to decrypt your data on other devices."
        )}
        <br />
        {translateMessage(
            "Also, please note that if you are using Peer-to-Peer synchronization, this configuration will be used when you switch to other methods and connect to a remote server in the future."
        )}
    </InfoNote>
    {#if encryptionSettings.encrypt}
        <InputRow label={translateMessage("Passphrase")}>
            <Password
                name="e2ee-passphrase"
                placeholder={translateMessage("Enter your passphrase")}
                bind:value={encryptionSettings.passphrase}
                required
            />
        </InputRow>
        <InfoNote warning>
            {translateMessage(
                "This setting must be the same even when connecting to multiple synchronisation destinations."
            )}
        </InfoNote>
        <InputRow label={translateMessage("Obfuscate Properties")}>
            <input type="checkbox" bind:checked={encryptionSettings.usePathObfuscation} />
        </InputRow>
        <InfoNote>
            {translateMessage(
                "Obfuscating properties (e.g., path of file, size, creation and modification dates) adds an additional layer of security by making it harder to identify the structure and names of your files and folders on the remote server. This helps protect your privacy and makes it more difficult for unauthorized users to infer information about your data."
            )}
        </InfoNote>
    {/if}

    <fieldset class="sls-id-choices" disabled={!encryptionSettings.encrypt}>
        <legend>{uiText("ID generation", "IDの生成")}</legend>
        <label class="sls-id-choice">
            <input
                type="radio"
                name="id-derivation-choice"
                value="keep"
                bind:group={idConfigurationChoice}
                onchange={selectIdConfiguration}
            />
            <div class="sls-id-choice-text">
                <span>{uiText("Keep current configuration", "現在の設定を維持")}</span>
                <small class="sls-current-id-configuration">
                    {#if idDerivationConfigured}
                        {encryptionSettings.encrypt
                            ? uiText("Current configuration: a saved ID key is used.", "現在の設定：保存済みのIDキーを使用します。")
                            : uiText("Current configuration: the saved ID key is retained while E2EE is off.", "現在の設定：E2EEが無効な間も保存済みのIDキーを保持します。")}
                    {:else}
                        {uiText("Current configuration: no ID key is saved. With E2EE enabled, keeping it uses legacy IDs tied to the E2EE passphrase.", "現在の設定：IDキーは保存されていません。この設定を維持すると、E2EEが有効な場合はE2EEパスフレーズに紐づく従来のIDを使用します。")}
                    {/if}
                </small>
            </div>
        </label>
        <label class="sls-id-choice">
            <input
                type="radio"
                name="id-derivation-choice"
                value="random"
                bind:group={idConfigurationChoice}
                onchange={selectIdConfiguration}
            />
            <span>{uiText("Generate a random ID key", "ランダムなIDキーを生成")}</span>
        </label>
        <label class="sls-id-choice">
            <input
                type="radio"
                name="id-derivation-choice"
                value="custom"
                bind:group={idConfigurationChoice}
                onchange={selectIdConfiguration}
            />
            <span>{uiText("Set an ID key", "IDキーを設定")}</span>
        </label>
    </fieldset>
    {#if encryptionSettings.encrypt && idConfigurationChoice === "keep" && !idDerivationConfigured}
        <InfoNote warning>
            {uiText("Changing the E2EE passphrase changes IDs generated by the legacy configuration.", "従来の設定では、E2EEパスフレーズを変更すると生成されるIDも変わります。")}
        </InfoNote>
    {/if}
    {#if (encryptionSettings.encrypt && idConfigurationChoice !== "keep") || idDerivationConfigured}
        {#if encryptionSettings.encrypt}
            <InfoNote>
                {uiText("This uses a saved key for new Chunk IDs and obfuscated Metadata document IDs, so changing the E2EE passphrase does not derive a new key automatically.", "新しいチャンクIDと難読化されたメタデータのドキュメントIDには保存済みのキーを使用するため、E2EEパスフレーズを変更しても新しいキーは自動生成されません。")}
            </InfoNote>
        {/if}
        {#if idDerivationConfigured}
            <InfoNote title={uiText("Configured", "設定済み")}>
                {uiText("The saved ID key is configured. Its source cannot be shown again.", "保存済みのIDキーが設定されています。生成元の入力は再表示できません。")}
            </InfoNote>
            <button type="button" onclick={() => (recoveryCodeVisible = !recoveryCodeVisible)}>
                {recoveryCodeVisible ? uiText("Hide current recovery code", "現在の復元コードを隠す") : uiText("Show current recovery code", "現在の復元コードを表示")}
            </button>
            {#if recoveryCodeVisible}
                <InputRow label={uiText("Current ID recovery code", "現在のID復元コード")}>
                    <input type="text" readonly value={recoveryCode} aria-label={uiText("Current ID recovery code", "現在のID復元コード")} />
                    <button type="button" onclick={copyRecoveryCode}>{uiText("Copy recovery code", "復元コードをコピー")}</button>
                </InputRow>
                {#if recoveryCodeCopied}
                    <InfoNote>{uiText("Recovery code copied.", "復元コードをコピーしました。")}</InfoNote>
                {/if}
            {/if}
        {/if}
        {#if encryptionSettings.encrypt}
            {#if idConfigurationChoice === "custom"}
                <fieldset class="sls-id-choices sls-id-custom-choices">
                    <legend>{uiText("How to set the ID key", "IDキーの設定方法")}</legend>
                    <label class="sls-id-choice">
                        <input
                            type="radio"
                            name="id-custom-choice"
                            value="passphrase"
                            bind:group={idCustomChoice}
                            onchange={selectIdCustomSource}
                        />
                        <span>{uiText("Derive from current E2EE passphrase", "現在のE2EEパスフレーズから生成")}</span>
                    </label>
                    <label class="sls-id-choice">
                        <input
                            type="radio"
                            name="id-custom-choice"
                            value="source"
                            bind:group={idCustomChoice}
                            onchange={selectIdCustomSource}
                        />
                        <span>{uiText("Enter an ID source", "IDキーの生成元を入力")}</span>
                    </label>
                    <label class="sls-id-choice">
                        <input
                            type="radio"
                            name="id-custom-choice"
                            value="recovery"
                            bind:group={idCustomChoice}
                            onchange={selectIdCustomSource}
                        />
                        <span>{uiText("Import an ID recovery code", "ID復元コードをインポート")}</span>
                    </label>
                </fieldset>
                {#if idCustomChoice === "source" || idCustomChoice === "recovery"}
                    <InputRow
                        label={idCustomChoice === "source" ? uiText("ID source", "IDキーの生成元") : uiText("ID recovery code", "ID復元コード")}
                    >
                        <Password
                            name="id-derivation-source"
                            placeholder={idCustomChoice === "source" ? uiText("Enter an ID source", "IDキーの生成元を入力") : uiText("Enter an ID recovery code", "ID復元コードを入力")}
                            bind:value={idDerivationSource}
                        />
                    </InputRow>
                {/if}
            {/if}
            {#if idDerivationConfigured && idConfigurationChoice !== "keep"}
                <InfoNote>
                    {uiText("The displayed recovery code belongs to the current key. Reopen this dialogue after saving to copy the replacement key.", "表示中の復元コードは現在のキーのものです。変更後のキーをコピーするには、保存してからこのダイアログを開き直してください。")}
                </InfoNote>
            {/if}
            {#if idConfigurationChoice === "custom" && idCustomChoice === "source"}
                <InfoNote>
                    {uiText("Choose a long, unpredictable source. It is used once and cannot be shown again after saving. A recovery code can be displayed on this device later. This input also accepts a tagged recovery code.", "長く推測されにくい生成元を指定してください。生成元は一度だけ使用され、保存後は再表示できません。復元コードは後からこのデバイスで表示できます。この入力欄には識別タグ付きの復元コードも入力できます。")}
                </InfoNote>
            {:else if idConfigurationChoice === "custom" && idCustomChoice === "recovery"}
                <InfoNote>
                    {uiText("Paste a tagged recovery code from an existing device to restore the same ID key.", "同じIDキーを復元するには、既存のデバイスから識別タグ付きの復元コードを貼り付けてください。")}
                </InfoNote>
            {:else if idConfigurationChoice === "random"}
                <InfoNote warning>
                    {uiText("For recovery after losing every device, save the recovery code after setup or choose an ID source you can reproduce.", "すべてのデバイスを失った場合に復元できるよう、設定後に復元コードを保存するか、再現可能なIDキーの生成元を選択してください。")}
                </InfoNote>
            {:else if idConfigurationChoice === "custom" && idCustomChoice === "passphrase"}
                <InfoNote warning>
                    {uiText("The ID key is derived from the current E2EE passphrase and saved separately. Changing that passphrase later does not change the saved ID key. To reduce the risk of guessing that passphrase from known IDs, use a separate, unpredictable ID source instead.", "IDキーは現在のE2EEパスフレーズから生成され、別に保存されます。後でパスフレーズを変更しても保存済みのIDキーは変わりません。既知のIDからパスフレーズを推測されるリスクを減らすには、別の推測されにくい生成元を使用してください。")}
                </InfoNote>
            {/if}
            {#if idDerivationConfigured && idConfigurationChoice === "custom" && idCustomChoice !== "passphrase"}
                <InfoNote>{uiText("Leave this input empty to keep the saved ID key.", "保存済みのIDキーを維持する場合は空欄にしてください。")}</InfoNote>
            {/if}
        {/if}
        <InfoNote error visible={idDerivationError !== ""}>{idDerivationError}</InfoNote>
    {/if}

    <InputRow label={uiText("Encrypt internal file Properties", "内部ファイルのプロパティを暗号化")}>
        <input
            type="checkbox"
            bind:checked={encryptionSettings.encryptInternalMetadata}
            disabled={!canEncryptInternalMetadata}
        />
    </InputRow>
    <InfoNote>
        {uiText("This option encrypts file properties used by Hidden File Sync and Customisation Sync.", "隠しファイル同期とカスタマイズ同期で使用するファイルのプロパティを暗号化します。")}
        <br />
        {uiText("It applies only to CouchDB and requires End-to-End Encryption, the V2 algorithm, and Property Encryption (Obfuscate Properties). The remote type is selected later in this setup wizard.", "CouchDBにのみ適用され、エンドツーエンド暗号化、V2アルゴリズム、およびプロパティの難読化が必要です。同期先の種類は、このウィザードの後の手順で選択します。")}
        <br />
        {uiText("It protects properties written after the option is enabled; existing properties are not rewritten. A manual remote Rebuild is strongly recommended to protect existing properties. Update every other synchronising device to a compatible version before enabling this option, including devices currently running LiveSync.", "有効化後に書き込まれるプロパティを保護します。既存のプロパティは書き換えません。既存のプロパティも保護するには、リモートの手動再構築を強く推奨します。有効化する前に、現在Self-hosted LiveSyncを実行しているデバイスも含め、ほかのすべての同期デバイスを対応バージョンへ更新してください。")}
    </InfoNote>

    <ExtraItems title={translateMessage("Advanced")}>
        <InputRow label={translateMessage("Encryption Algorithm")}>
            <select bind:value={encryptionSettings.E2EEAlgorithm} disabled={!encryptionSettings.encrypt}>
                {#each Object.values(E2EEAlgorithms) as alg}
                    <option value={alg}>{E2EEAlgorithmNames[alg] ?? alg}</option>
                {/each}
            </select>
        </InputRow>
        <InfoNote>
            {translateMessage(
                "In most cases, you should stick with the default algorithm (${algorithm}), This setting is only required if you have an existing Vault encrypted in a different format.",
                { algorithm: E2EEAlgorithmNames[DEFAULT_SETTINGS.E2EEAlgorithm] }
            )}
        </InfoNote>
        <InfoNote warning>
            {translateMessage(
                "Changing the encryption algorithm will prevent access to any data previously encrypted with a different algorithm. Ensure that all your devices are configured to use the same algorithm to maintain access to your data."
            )}
        </InfoNote>
    </ExtraItems>

    <InfoNote warning>
        <p>
            {translateMessage(
                "Please be aware that the End-to-End Encryption passphrase is not validated until the synchronisation process actually commences. This is a security measure designed to protect your data."
            )}
        </p>
        <p>
            {translateMessage(
                "Therefore, we ask that you exercise extreme caution when configuring server information manually. If an incorrect passphrase is entered, the data on the server will become corrupted."
            )} <br /><br />
            {translateMessage("Please understand that this is intended behaviour.")}
        </p>
    </InfoNote>

    <UserDecisions>
        <Decision title={translateMessage("Proceed")} important disabled={!e2eeValid} commit={() => commit()} />
        <Decision title={translateMessage("Cancel")} commit={() => setResult(TYPE_CANCELLED)} />
    </UserDecisions>
</div>

<style>
    .sls-e2ee-dialog {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }
    :global(.dialog-host .sls-e2ee-dialog label > span) {
        width: auto;
        min-width: 8em;
    }
    .sls-id-choices {
        border: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35em;
        margin: 0;
        min-width: 0;
        padding: 0;
    }
    .sls-id-choices legend {
        margin-bottom: 0.35em;
    }
    .sls-id-choices:disabled {
        opacity: 0.6;
    }
    .sls-id-custom-choices {
        margin-left: 1.5em;
    }
    .sls-id-choice {
        align-items: flex-start;
        display: flex;
        gap: 0.5em;
    }
    .sls-id-choice input[type="radio"] {
        flex: none;
        margin-top: 0.25em;
    }
    .sls-id-choice-text {
        display: flex;
        flex-direction: column;
    }
    .sls-current-id-configuration {
        color: var(--text-muted);
        display: block;
        font-size: var(--font-ui-smaller);
        margin-top: 0.15em;
    }
</style>
