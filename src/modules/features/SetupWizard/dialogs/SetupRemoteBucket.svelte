<script lang="ts">
    import DialogHeader from "@/lib/src/UI/components/DialogHeader.svelte";
    import Guidance from "@/lib/src/UI/components/Guidance.svelte";
    import Decision from "@/lib/src/UI/components/Decision.svelte";
    import UserDecisions from "@/lib/src/UI/components/UserDecisions.svelte";
    import InfoNote from "@/lib/src/UI/components/InfoNote.svelte";
    import ExtraItems from "@/lib/src/UI/components/ExtraItems.svelte";
    import InputRow from "@/lib/src/UI/components/InputRow.svelte";
    import Password from "@/lib/src/UI/components/Password.svelte";
    import {
        type BucketSyncSetting,
        type ObsidianLiveSyncSettings,
        DEFAULT_SETTINGS,
        PREFERRED_JOURNAL_SYNC,
        RemoteTypes,
    } from "@lib/common/types";

    import { onMount } from "svelte";
    import { getDialogContext, type GuestDialogProps } from "@lib/UI/svelteDialog";
    import { copyTo, pickBucketSyncSettings } from "@lib/common/utils";
    import { TYPE_CANCELLED, type SetupRemoteBucketResultType } from "./setupDialogTypes";

    const default_setting = pickBucketSyncSettings(DEFAULT_SETTINGS);

    let syncSetting = $state<BucketSyncSetting>({ ...default_setting });

    type Props = GuestDialogProps<SetupRemoteBucketResultType, BucketSyncSetting>;

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
    const isEndpointSecure = $derived.by(() => {
        return syncSetting.endpoint.trim().toLowerCase().startsWith("https://");
    });
    const isEndpointInsecure = $derived.by(() => {
        return syncSetting.endpoint.trim().toLowerCase().startsWith("http://");
    });
    const isEndpointSupplied = $derived.by(() => {
        return isEndpointInsecure || isEndpointSecure;
    });
    const canProceed = $derived.by(() => {
        return (
            syncSetting.accessKey.trim() !== "" &&
            syncSetting.secretKey.trim() !== "" &&
            syncSetting.bucket.trim() !== "" &&
            syncSetting.endpoint.trim() !== "" &&
            syncSetting.region.trim() !== "" &&
            isEndpointSupplied
        );
    });

    function generateSetting() {
        const connSetting: BucketSyncSetting = {
            ...syncSetting,
        };
        const trialSettings: BucketSyncSetting = {
            ...connSetting,
        };

        const trialRemoteSetting: ObsidianLiveSyncSettings = {
            ...DEFAULT_SETTINGS,
            ...PREFERRED_JOURNAL_SYNC,
            remoteType: RemoteTypes.REMOTE_MINIO,
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
                setResult(pickBucketSyncSettings(setting));
                return;
            }
        } catch (e) {
            error = `接続テスト中にエラーが発生しました: ${e}`;
            return;
        }
    }
    function commit() {
        const setting = pickBucketSyncSettings(generateSetting());
        setResult(setting);
    }
    function cancel() {
        setResult(TYPE_CANCELLED);
    }
</script>

<DialogHeader title="S3/MinIO/R2設定" />
<Guidance>S3/MinIO/R2互換オブジェクトストレージサービスへ接続するために必要な情報を入力してください。</Guidance>
<InputRow label="エンドポイントURL">
    <input
        type="text"
        name="s3-endpoint"
        placeholder="https://s3.amazonaws.com"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        pattern="^https?://.+"
        bind:value={syncSetting.endpoint}
    />
</InputRow>
<InfoNote warning visible={isEndpointInsecure}>Obsidian Mobileでは安全な接続（HTTPS）のみ使用できます。</InfoNote>

<InputRow label="アクセスキーID">
    <input
        type="text"
        name="s3-access-key-id"
        placeholder="アクセスキーIDを入力"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={syncSetting.accessKey}
    />
</InputRow>

<InputRow label="シークレットアクセスキー">
    <Password
        name="s3-secret-access-key"
        placeholder="シークレットアクセスキーを入力"
        required
        bind:value={syncSetting.secretKey}
    />
</InputRow>
<InputRow label="バケット名">
    <input
        type="text"
        name="s3-bucket-name"
        placeholder="バケット名を入力"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        required
        bind:value={syncSetting.bucket}
    /></InputRow
>
<InputRow label="リージョン">
    <input
        type="text"
        name="s3-region"
        placeholder="リージョンを入力（例: us-east-1、R2ではauto）"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.region}
    />
</InputRow>
<InputRow label="パス形式アクセスを使用">
    <input type="checkbox" name="s3-use-path-style" bind:checked={syncSetting.forcePathStyle} />
</InputRow>

<InputRow label="フォルダー接頭辞">
    <input
        type="text"
        name="s3-folder-prefix"
        placeholder="フォルダー接頭辞を入力（任意）"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={syncSetting.bucketPrefix}
    />
</InputRow>
<InfoNote>
    バケット内の特定フォルダーにデータを保存したい場合は、ここでフォルダー接頭辞を指定できます。バケットのルートに保存する場合は空欄のままにしてください。
</InfoNote>
<InputRow label="内部APIを使用">
    <input type="checkbox" name="s3-use-internal-api" bind:checked={syncSetting.useCustomRequestHandler} />
</InputRow>
<InfoNote>
    CORSの問題を回避できない場合は、このオプションを試せます。Obsidianの内部APIを使ってS3サーバーと通信します。Web標準には準拠していませんが動作します。将来のObsidianバージョンで動かなくなる可能性があります。
</InfoNote>

<ExtraItems title="詳細設定">
    <InputRow label="カスタムヘッダー">
        <textarea
            name="bucket-custom-headers"
            placeholder="例: x-example-header: value\n another-header: value2"
            bind:value={syncSetting.bucketCustomHeaders}
            autocapitalize="off"
            spellcheck="false"
            rows="4"
        ></textarea>
    </InputRow>
</ExtraItems>

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
