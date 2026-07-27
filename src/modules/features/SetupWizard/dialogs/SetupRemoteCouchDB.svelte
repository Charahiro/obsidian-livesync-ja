<script lang="ts">
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
        PREFERRED_SETTING_CLOUDANT,
        PREFERRED_SETTING_SELF_HOSTED,
        RemoteTypes,
        type CouchDBConnection,
        type ObsidianLiveSyncSettings,
    } from "@vrtmrz/livesync-commonlib/compat/common/types";
    import { isCloudantURI } from "@vrtmrz/livesync-commonlib/compat/pouchdb/utils_couchdb";

    import { onMount } from "svelte";
    import { getDialogContext, type GuestDialogProps } from "@/modules/services/LiveSyncUI/svelteDialog";
    import { copyTo, pickCouchDBSyncSettings } from "@vrtmrz/livesync-commonlib/compat/common/utils";
    import PanelCouchDBCheck from "./PanelCouchDBCheck.svelte";
    import {
        TYPE_CANCELLED,
        type CouchDBSetupMode,
        type SetupRemoteCouchDBInitialData,
        type SetupRemoteCouchDBResultType,
    } from "./setupDialogTypes";
    import { isValidCouchDBServerURL, probeCouchDBConnection } from "./couchDBConnectionProbe";
    import { $msg as translateMessage } from "@/common/translation";

    const default_setting = pickCouchDBSyncSettings(DEFAULT_SETTINGS);

    let syncSetting = $state<CouchDBConnection>({ ...default_setting });
    let setupMode = $state<CouchDBSetupMode>("settings");
    type Props = GuestDialogProps<SetupRemoteCouchDBResultType, SetupRemoteCouchDBInitialData>;
    const { setResult, getInitialData }: Props = $props();
    onMount(() => {
        if (getInitialData) {
            const initialData = getInitialData();
            if (initialData) {
                setupMode = initialData.mode;
                copyTo(initialData.settings, syncSetting);
            }
        }
    });

    let error = $state("");
    const context = getDialogContext();

    function generateSetting() {
        const connSetting: CouchDBConnection = {
            ...syncSetting,
        };
        const trialSettings: CouchDBConnection = {
            ...connSetting,
            // ...encryptionSettings,
        };
        const preferredSetting = isCloudantURI(syncSetting.couchDB_URI)
            ? PREFERRED_SETTING_CLOUDANT
            : PREFERRED_SETTING_SELF_HOSTED;
        const trialRemoteSetting: ObsidianLiveSyncSettings = {
            ...DEFAULT_SETTINGS,
            ...preferredSetting,
            remoteType: RemoteTypes.REMOTE_COUCHDB,
            ...trialSettings,
        };
        return trialRemoteSetting;
    }
    let processing = $state(false);
    async function checkConnection() {
        try {
            processing = true;
            const trialRemoteSetting = generateSetting();
            const replicator = await context.services.replicator.getNewReplicator(trialRemoteSetting);
            if (!replicator) {
                return "Failed to create replicator instance.";
            }
            try {
                const result = await probeCouchDBConnection(
                    replicator,
                    trialRemoteSetting,
                    setupMode === "create-or-connect"
                );
                if (result.ok) {
                    return "";
                } else {
                    return `Failed to connect to the server: ${result.reason}`;
                }
            } catch (e) {
                return `Failed to connect to the server: ${e}`;
            }
        } finally {
            processing = false;
        }
    }

    async function checkAndCommit() {
        error = "";
        try {
            error = (await checkConnection()) || "";
            if (!error) {
                const setting = generateSetting();
                setResult(pickCouchDBSyncSettings(setting));
                return;
            }
        } catch (e) {
            error = `Error during connection test: ${e}`;
            return;
        }
    }
    function commit() {
        const setting = pickCouchDBSyncSettings(generateSetting());
        setResult(setting);
    }
    function cancel() {
        setResult(TYPE_CANCELLED);
    }

    // const isURICloudant = $derived.by(() => {
    //     return syncSetting.couchDB_URI && isCloudantURI(syncSetting.couchDB_URI);
    // });
    // const isURISelfHosted = $derived.by(() => {
    //     return syncSetting.couchDB_URI && !isCloudantURI(syncSetting.couchDB_URI);
    // });
    // const isURISecure = $derived.by(() => {
    //     return syncSetting.couchDB_URI && syncSetting.couchDB_URI.startsWith("https://");
    // });
    const isURIInsecure = $derived.by(() => {
        return !!(syncSetting.couchDB_URI && syncSetting.couchDB_URI.startsWith("http://"));
    });
    const isUseJWT = $derived.by(() => {
        return syncSetting.useJWT;
    });
    const canProceed = $derived.by(() => {
        return (
            isValidCouchDBServerURL(syncSetting.couchDB_URI.trim()) &&
            syncSetting.couchDB_USER.trim().length > 0 &&
            syncSetting.couchDB_PASSWORD.trim().length > 0 &&
            syncSetting.couchDB_DBNAME.trim().length > 0 &&
            (isUseJWT ? syncSetting.jwtKey.trim().length > 0 : true)
        );
    });
    const testSettings = $derived.by(() => {
        return generateSetting();
    });
    const isURLInvalid = $derived.by(
        () => syncSetting.couchDB_URI.trim() !== "" && !isValidCouchDBServerURL(syncSetting.couchDB_URI.trim())
    );
    const primaryActionTitle = $derived.by(() => {
        if (setupMode === "create-or-connect") {
            return translateMessage("Create or connect to database and continue");
        }
        if (setupMode === "connect-existing") {
            return translateMessage("Connect to existing database and continue");
        }
        return translateMessage("Test connection and save");
    });
</script>

<DialogHeader title="CouchDB設定" />
<Guidance>CouchDBサーバーの情報を入力してください。</Guidance>
<InputRow label="URL">
    <input
        type="text"
        name="couchdb-url"
        placeholder="https://example.com"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.couchDB_URI}
        required
        pattern="^https?://.+"
    />
</InputRow>
<InfoNote warning visible={isURIInsecure}>Obsidian Mobileでは安全な接続（HTTPS）のみ使用できます。</InfoNote>
<InfoNote warning visible={isURLInvalid}>{translateMessage("Enter a complete HTTP or HTTPS URL.")}</InfoNote>
<InputRow label="ユーザー名">
    <input
        type="text"
        name="couchdb-username"
        placeholder="ユーザー名を入力"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={syncSetting.couchDB_USER}
    />
</InputRow>
<InputRow label="パスワード">
    <Password
        name="couchdb-password"
        placeholder="パスワードを入力"
        bind:value={syncSetting.couchDB_PASSWORD}
        required
    />
</InputRow>

<InputRow label="データベース名">
    <input
        type="text"
        name="couchdb-database"
        placeholder="データベース名を入力"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={syncSetting.couchDB_DBNAME}
    />
</InputRow>
<InfoNote>
    {translateMessage("CouchDB validates the database name when you connect. The name must not be empty.")}
</InfoNote>
<InputRow label="内部APIを使用">
    <input type="checkbox" name="couchdb-use-internal-api" bind:checked={syncSetting.useRequestAPI} />
</InputRow>
<InfoNote>
    CORSの問題を回避できない場合に試すための設定です。Obsidianの内部APIを使ってCouchDBサーバーと通信します。Web標準には準拠しておらず、将来のObsidianで動作しなくなる可能性があります。
</InfoNote>

<ExtraItems title="詳細設定">
    <InputRow label="カスタムヘッダー">
        <textarea
            name="couchdb-custom-headers"
            placeholder="e.g., x-example-header: value\n another-header: value2"
            bind:value={syncSetting.couchDB_CustomHeaders}
            autocapitalize="off"
            spellcheck="false"
            rows="4"
        ></textarea>
    </InputRow>
</ExtraItems>
<ExtraItems title="実験的な設定">
    <InputRow label="JWT認証を使用">
        <input type="checkbox" name="couchdb-use-jwt" bind:checked={syncSetting.useJWT} />
    </InputRow>
    <InputRow label="JWTアルゴリズム">
        <select bind:value={syncSetting.jwtAlgorithm} disabled={!isUseJWT}>
            <option value="HS256">HS256</option>
            <option value="HS512">HS512</option>
            <option value="ES256">ES256</option>
            <option value="ES512">ES512</option>
        </select>
    </InputRow>
    <InputRow label="JWT有効期間（分）">
        <input
            type="text"
            name="couchdb-jwt-exp-duration"
            placeholder="0"
            bind:value={() => `${syncSetting.jwtExpDuration}`, (v) => (syncSetting.jwtExpDuration = parseInt(v) || 0)}
            disabled={!isUseJWT}
        />
    </InputRow>
    <InputRow label="JWTキー">
        <textarea
            name="couchdb-jwt-key"
            rows="5"
            autocapitalize="off"
            spellcheck="false"
            placeholder="JWTシークレットまたは秘密鍵を入力"
            bind:value={syncSetting.jwtKey}
            disabled={!isUseJWT}
        ></textarea>
    </InputRow>
    <InfoNote>
        HS256/HS512では共有シークレットを、ES256/ES512ではPKCS#8 PEM形式の秘密鍵を指定してください。
    </InfoNote>
    <InputRow label="JWTキーID（kid）">
        <input
            type="text"
            name="couchdb-jwt-kid"
            placeholder="JWTキーIDを入力"
            bind:value={syncSetting.jwtKid}
            disabled={!isUseJWT}
        />
    </InputRow>
    <InputRow label="JWTサブジェクト（sub）">
        <input
            type="text"
            name="couchdb-jwt-sub"
            placeholder="JWTサブジェクト（CouchDBユーザー名）を入力"
            bind:value={syncSetting.jwtSub}
            disabled={!isUseJWT}
        />
    </InputRow>
    <InfoNote warning>
        JWT（JSON Web Token）認証を使うと、トークンでCouchDBサーバーへ安全に認証できます。CouchDBサーバーがJWTを受け付けるよう設定され、入力した鍵と設定がサーバー構成に一致していることを確認してください。この機能は十分に検証されていません。
    </InfoNote>
</ExtraItems>

<InfoNote warning>
    {translateMessage(
        "This optional check uses Obsidian's internal request API and sends the credentials above to the CouchDB server. Use it only with a server you trust; administrator access may be required."
    )}
</InfoNote>
<PanelCouchDBCheck trialRemoteSetting={testSettings}></PanelCouchDBCheck>
<hr />

<InfoNote error visible={error !== ""}>
    {error}
</InfoNote>

{#if processing}
    接続を確認しています。しばらくお待ちください。
{:else}
    <UserDecisions>
        <Decision title={primaryActionTitle} important disabled={!canProceed} commit={() => checkAndCommit()} />
        {#if setupMode === "settings"}
            <InfoNote warning>
                {translateMessage(
                    "Saving without a successful connection test keeps this profile, but automatic synchronisation may fail until the connection is corrected."
                )}
            </InfoNote>
            <Decision
                title={translateMessage("Save without connecting")}
                disabled={!canProceed}
                commit={() => commit()}
            />
        {/if}
        <Decision title="キャンセル" commit={() => cancel()} />
    </UserDecisions>
{/if}
