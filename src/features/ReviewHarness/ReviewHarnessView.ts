import { ItemView, Notice, Setting, type WorkspaceLeaf } from "@/deps";
import {
    REVIEW_HARNESS_SCENARIOS,
    type ReviewHarnessScenarioId,
    type ReviewHarnessScenarioStatus,
} from "./reviewHarnessContract";
import type { ReviewHarnessController } from "./reviewHarnessController";

export const VIEW_TYPE_REVIEW_HARNESS = "self-hosted-livesync-review-harness";

const STATUS_LABELS: Record<ReviewHarnessScenarioStatus, string> = {
    idle: `未実行`,
    queued: `待機中`,
    running: `実行中`,
    "waiting-for-user": `レビュー待ち`,
    passed: `成功`,
    failed: `失敗`,
    cancelled: `キャンセル`,
};
const MODE_LABELS = {
    automatic: `自動`,
    guided: `ガイド付き`,
} as const;
const ACCESS_LABELS = {
    "dedicated-vault-fixtures": `専用Vault内のテスト用ファイル`,
    "device-local-state": `このデバイス内の状態`,
    "read-only": `読み取り専用`,
} as const;

export class ReviewHarnessView extends ItemView {
    override icon = "test-tube-2";
    override navigation = true;
    private unsubscribe: (() => void) | undefined;

    constructor(
        leaf: WorkspaceLeaf,
        private readonly controller: ReviewHarnessController
    ) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_REVIEW_HARNESS;
    }

    getDisplayText(): string {
        return `Self-hosted LiveSyncレビューハーネス`;
    }

    override async onOpen(): Promise<void> {
        this.unsubscribe = this.controller.subscribe(() => this.render());
        this.render();
        await Promise.resolve();
    }

    override async onClose(): Promise<void> {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
        await Promise.resolve();
    }

    private addActionButton(
        setting: Setting,
        label: string,
        testId: string,
        action: () => void | Promise<void>,
        cta = false
    ): void {
        setting.addButton((button) => {
            button.setButtonText(label);
            if (cta) button.setCta();
            button.buttonEl.dataset.testid = testId;
            button.onClick(() => void action());
        });
    }

    private renderScenario(id: ReviewHarnessScenarioId): void {
        const scenario = REVIEW_HARNESS_SCENARIOS.find((candidate) => candidate.id === id)!;
        const snapshot = this.controller.snapshot();
        const result = snapshot.results[id];
        const setting = new Setting(this.contentEl)
            .setName(scenario.title)
            .setDesc(
                `${scenario.description} モード：${MODE_LABELS[scenario.mode]}。アクセス：${ACCESS_LABELS[scenario.access]}。`
            )
            .setClass("sls-review-harness__scenario");
        setting.settingEl.dataset.testid = `review-harness-scenario-${id}`;

        this.addActionButton(
            setting,
            id === "compatibility-review"
                ? `レビューを開始`
                : `実行`,
            `review-harness-run-${id}`,
            () => this.controller.runScenario(id)
        );

        const resultEl = this.contentEl.createDiv({ cls: "sls-review-harness__result" });
        resultEl.dataset.testid = `review-harness-result-${id}`;
        resultEl.createEl("strong", { text: `${STATUS_LABELS[result.status]}: ` });
        resultEl.appendText(result.detail);
        if (result.observations.length > 0) {
            const observations = resultEl.createEl("ul");
            for (const observation of result.observations) observations.createEl("li", { text: observation });
        }

        if (id === "compatibility-review" && result.status === "waiting-for-user") {
            const actions = new Setting(this.contentEl).setClass("sls-review-harness__actions");
            this.addActionButton(
                actions,
                `互換性レビューを開く`,
                "review-harness-open-compatibility-review",
                () => this.controller.openCompatibilityReview(),
                true
            );
            this.addActionButton(actions, `再起動して戻る`, "review-harness-restart", () =>
                this.controller.prepareCompatibilityReviewRestart()
            );
        }
    }

    private render(): void {
        this.contentEl.empty();
        this.contentEl.addClass("sls-review-harness");
        this.contentEl.dataset.testid = "review-harness";
        this.contentEl.createEl("h2", { text: `Self-hosted LiveSyncレビューハーネス` });
        this.contentEl.createEl("p", {
            text: `専用のテストVaultを使用してください。読み取り専用のシナリオにはその旨が表示されます。Vaultの往復確認は、確認後に固定のテスト用ツリーへ書き込み、処理の終了時に削除します。任意のコマンド、パス、コード、リモート認証情報を受け付けることはありません。`,
            cls: "sls-review-harness__warning",
        });
        this.contentEl.createEl("p", {
            text: `自動テストではローカルの契約を検査します。ガイド付き互換性レビューでは、通常の起動時と同じデバイス内の一時停止と明示的な操作を使用します。実際のP2P通信はCompose E2Eテストで引き続き確認されます。`,
        });

        const snapshot = this.controller.snapshot();
        if (snapshot.continuationError) {
            this.contentEl.createEl("p", {
                text: `継続情報のエラー：${snapshot.continuationError}`,
                cls: "sls-review-harness__error",
            });
        } else if (snapshot.resumedRequestId) {
            const resumed = this.contentEl.createEl("p", {
                text: `再起動後の一度限りの継続情報を読み込みました。以下のガイド付きレビューを完了してください。`,
                cls: "sls-review-harness__resumed",
            });
            resumed.dataset.testid = "review-harness-resumed";
        }

        const suiteActions = new Setting(this.contentEl)
            .setName(`レビュー一式`)
            .setDesc(
                snapshot.running
                    ? `${snapshot.current ?? "シナリオ"}を実行中です。`
                    : `実行する範囲を選択してください。`
            )
            .setClass("sls-review-harness__actions");
        this.addActionButton(suiteActions, `自動テスト`, "review-harness-run-automatic", () =>
            this.controller.runAutomaticScenarios()
        );
        this.addActionButton(suiteActions, `すべて確認`, "review-harness-run-full", () =>
            this.controller.runAllScenarios()
        );
        this.addActionButton(suiteActions, `Markdownレポートをコピー`, "review-harness-copy-report", async () => {
            await this.controller.copyReport();
            new Notice(`レビューハーネスのMarkdownレポートをコピーしました。`);
        });

        this.contentEl.createEl("h3", { text: `シナリオ` });
        for (const { id } of REVIEW_HARNESS_SCENARIOS) this.renderScenario(id);

        this.contentEl.createEl("p", {
            text: `レポートはローカルでコピーされ、送信されません。Vaultの識別子、パス、内容、リモート設定、機密情報は含まれません。`,
            cls: "sls-review-harness__privacy",
        });
    }
}
