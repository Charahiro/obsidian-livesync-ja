<script lang="ts">
    import DialogHeader from "@lib/UI/components/DialogHeader.svelte";
    import Guidance from "@lib/UI/components/Guidance.svelte";
    import Decision from "@lib/UI/components/Decision.svelte";
    import UserDecisions from "@lib/UI/components/UserDecisions.svelte";
    import InfoNote from "@lib/UI/components/InfoNote.svelte";
    import ExtraItems from "@lib/UI/components/ExtraItems.svelte";
    import InputRow from "@lib/UI/components/InputRow.svelte";
    import Password from "@lib/UI/components/Password.svelte";
    import {
        DEFAULT_SETTINGS,
        PREFERRED_SETTING_CLOUDANT,
        PREFERRED_SETTING_SELF_HOSTED,
        RemoteTypes,
        type CouchDBConnection,
        type ObsidianLiveSyncSettings,
    } from "@lib/common/types";
    import { isCloudantURI } from "@lib/pouchdb/utils_couchdb";

    import { onMount } from "svelte";
    import { getDialogContext, type GuestDialogProps } from "@lib/UI/svelteDialog";
    import { copyTo, pickCouchDBSyncSettings } from "@lib/common/utils";
    import PanelCouchDBCheck from "./PanelCouchDBCheck.svelte";
    import { TYPE_CANCELLED, type SetupRemoteCouchDBResultType } from "./setupDialogTypes";

    const default_setting = pickCouchDBSyncSettings(DEFAULT_SETTINGS);

    let syncSetting = $state<CouchDBConnection>({ ...default_setting });
    type Props = GuestDialogProps<SetupRemoteCouchDBResultType, CouchDBConnection>;
    const { setResult, getInitialData }: Props = $props();
    onMount(() => {
        if (getInitialData) {
            const initialData = getInitialData();
            if (initialData) {
                copyTo(initialData, syncSetting);
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
                return "レプリケーターインスタンスを作成できませんでした。";
            }
            try {
                const result = await replicator.tryConnectRemote(trialRemoteSetting, false);
                if (result) {
                    return "";
                } else {
                    return "サーバーに接続できませんでした。設定を確認してください。";
                }
            } catch (e) {
                return `サーバーに接続できませんでした: ${e}`;
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
            error = `接続テスト中にエラーが発生しました: ${e}`;
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
            syncSetting.couchDB_URI.trim().length > 0 &&
            syncSetting.couchDB_USER.trim().length > 0 &&
            syncSetting.couchDB_PASSWORD.trim().length > 0 &&
            syncSetting.couchDB_DBNAME.trim().length > 0 &&
            (isUseJWT ? syncSetting.jwtKey.trim().length > 0 : true)
        );
    });
    const testSettings = $derived.by(() => {
        return generateSetting();
    });
</script>

<DialogHeader title="CouchDB設定" />
<Guidance>CouchDBサーバー情報を入力してください。</Guidance>
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
        pattern="^[a-z][a-z0-9_$()+/-]*$"
        bind:value={syncSetting.couchDB_DBNAME}
    />
</InputRow>
<InfoNote>
    データベース名には大文字、空白、特殊文字は使用できません。また、アンダースコア（_）で始めることもできません。
</InfoNote>
<InputRow label="内部APIを使用">
    <input type="checkbox" name="couchdb-use-internal-api" bind:checked={syncSetting.useRequestAPI} />
</InputRow>
<InfoNote>
    CORSの問題を回避できない場合は、このオプションを試せます。Obsidianの内部APIを使ってCouchDBサーバーと通信します。Web標準には準拠していませんが動作します。将来のObsidianバージョンで動かなくなる可能性があります。
</InfoNote>

<ExtraItems title="詳細設定">
    <InputRow label="カスタムヘッダー">
        <textarea
            name="couchdb-custom-headers"
            placeholder="例: x-example-header: value\n another-header: value2"
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
        For HS256/HS512 algorithms, provide the shared secret key. For ES256/ES512 algorithms, provide the pkcs8
        PEM-formatted private key.
    </InfoNote>
    <InputRow label="JWTキーID (kid)">
        <input
            type="text"
            name="couchdb-jwt-kid"
            placeholder="JWTキーIDを入力"
            bind:value={syncSetting.jwtKid}
            disabled={!isUseJWT}
        />
    </InputRow>
    <InputRow label="JWTサブジェクト (sub)">
        <input
            type="text"
            name="couchdb-jwt-sub"
            placeholder="JWTサブジェクト（CouchDBユーザー名）を入力"
            bind:value={syncSetting.jwtSub}
            disabled={!isUseJWT}
        />
    </InputRow>
    <InfoNote warning>
        JWT認証では、トークンを使ってCouchDBサーバーへ安全に認証できます。CouchDBサーバーがJWTを受け入れるよう設定されており、指定したキーと設定がサーバー設定と一致していることを確認してください。なお、この機能は十分には検証されていません。
    </InfoNote>
</ExtraItems>

<PanelCouchDBCheck trialRemoteSetting={testSettings}></PanelCouchDBCheck>
<hr />

<InfoNote error visible={error !== ""}>
    {error}
</InfoNote>

{#if processing}
    接続を確認しています。しばらくお待ちください。
{:else}
    <UserDecisions>
        <Decision title="設定をテストして続行" important disabled={!canProceed} commit={() => checkAndCommit()} />
        <Decision title="このまま続行" commit={() => commit()} />
        <Decision title="キャンセル" commit={() => cancel()} />
    </UserDecisions>
{/if}
