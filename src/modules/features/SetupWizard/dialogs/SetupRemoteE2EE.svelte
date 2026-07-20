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
        DEFAULT_SETTINGS,
        E2EEAlgorithmNames,
        E2EEAlgorithms,
        type EncryptionSettings,
    } from "@lib/common/types";
    import { onMount } from "svelte";
    import type { GuestDialogProps } from "@lib/UI/svelteDialog";
    import { copyTo, pickEncryptionSettings } from "@lib/common/utils";
    import { TYPE_CANCELLED, type SetupRemoteE2EEResultType } from "./setupDialogTypes";

    type Props = GuestDialogProps<SetupRemoteE2EEResultType, EncryptionSettings>;
    const { setResult, getInitialData }: Props = $props();
    let default_encryption: EncryptionSettings = {
        encrypt: true,
        passphrase: "",
        E2EEAlgorithm: DEFAULT_SETTINGS.E2EEAlgorithm,
        usePathObfuscation: true,
    } as EncryptionSettings;

    let encryptionSettings = $state<EncryptionSettings>({ ...default_encryption });

    onMount(() => {
        if (getInitialData) {
            const initialData = getInitialData();
            if (initialData) {
                copyTo(initialData, encryptionSettings);
            }
        }
    });
    let e2eeValid = $derived.by(() => {
        if (!encryptionSettings.encrypt) return true;
        return encryptionSettings.passphrase.trim().length >= 1;
    });

    function commit() {
        setResult(pickEncryptionSettings(encryptionSettings));
    }
</script>

<DialogHeader title="エンドツーエンド暗号化" />
<Guidance>エンドツーエンド暗号化の設定を行ってください。</Guidance>
<InputRow label="エンドツーエンド暗号化">
    <input type="checkbox" bind:checked={encryptionSettings.encrypt} />
    <Password
        name="e2ee-passphrase"
        placeholder="パスフレーズを入力"
        bind:value={encryptionSettings.passphrase}
        disabled={!encryptionSettings.encrypt}
        required={encryptionSettings.encrypt}
    />
</InputRow>
<InfoNote title="強く推奨">
    エンドツーエンド暗号化を有効にすると、データはリモートサーバーへ送信される前にこのデバイス上で暗号化されます。つまり、誰かがサーバーへアクセスできたとしても、パスフレーズなしではデータを読み取れません。別のデバイスでデータを復号する際にも必要になるため、パスフレーズは必ず覚えておいてください。
    <br />
    また、Peer-to-Peer同期を使用している場合でも、将来ほかの方式へ切り替えてリモートサーバーに接続するときは、この設定が使用されます。
</InfoNote>
<InfoNote warning>
    複数の同期先に接続する場合でも、この設定は同じである必要があります。
</InfoNote>
<InputRow label="プロパティを難読化">
    <input
        type="checkbox"
        bind:checked={encryptionSettings.usePathObfuscation}
        disabled={!encryptionSettings.encrypt}
    />
</InputRow>

<InfoNote>
    プロパティ（ファイルパス、サイズ、作成日時、更新日時など）を難読化すると、リモートサーバー上でファイルやフォルダーの構造や名前を特定しにくくなり、追加の保護層になります。プライバシー保護に役立ち、権限のないユーザーがデータの内容を推測しにくくなります。
</InfoNote>

<ExtraItems title="詳細設定">
    <InputRow label="暗号化アルゴリズム">
        <select bind:value={encryptionSettings.E2EEAlgorithm} disabled={!encryptionSettings.encrypt}>
            {#each Object.values(E2EEAlgorithms) as alg}
                <option value={alg}>{E2EEAlgorithmNames[alg] ?? alg}</option>
            {/each}
        </select>
    </InputRow>
    <InfoNote>
        ほとんどの場合、既定のアルゴリズム（{E2EEAlgorithmNames[
            DEFAULT_SETTINGS.E2EEAlgorithm
        ]}）を使用してください。この設定が必要なのは、異なる形式で暗号化された既存のVaultがある場合のみです。
    </InfoNote>
    <InfoNote warning>
        暗号化アルゴリズムを変更すると、以前に別のアルゴリズムで暗号化されたデータにアクセスできなくなります。データへアクセスし続けるには、すべてのデバイスで同じアルゴリズムを使用してください。
    </InfoNote>
</ExtraItems>

<InfoNote warning>
    <p>
        エンドツーエンド暗号化のパスフレーズは、同期処理が実際に開始されるまで検証されません。これはデータを保護するためのセキュリティ対策です。
    </p>
    <p>
        そのため、サーバー情報を手動で設定する場合は十分に注意してください。誤ったパスフレーズを入力すると、サーバー上のデータが破損します。<br /><br />
        これは意図された動作であることをご理解ください。
    </p>
</InfoNote>

<UserDecisions>
    <Decision title="続行" important disabled={!e2eeValid} commit={() => commit()} />
    <Decision title="キャンセル" commit={() => setResult(TYPE_CANCELLED)} />
</UserDecisions>
