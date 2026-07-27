import { ItemView, Notice, Setting, type WorkspaceLeaf } from "@/deps";
import {
    REVIEW_HARNESS_SCENARIOS,
    type ReviewHarnessScenarioId,
    type ReviewHarnessScenarioStatus,
} from "./reviewHarnessContract";
import type { ReviewHarnessController } from "./reviewHarnessController";
import { $msg } from "@/common/translation";

export const VIEW_TYPE_REVIEW_HARNESS = "self-hosted-livesync-review-harness";

const STATUS_LABELS: Record<ReviewHarnessScenarioStatus, string> = {
    idle: $msg("ReviewHarness.Status.NotRun"),
    queued: $msg("ReviewHarness.Status.Queued"),
    running: $msg("ReviewHarness.Status.Running"),
    "waiting-for-user": $msg("ReviewHarness.Status.WaitingForReview"),
    passed: $msg("ReviewHarness.Status.Passed"),
    failed: $msg("ReviewHarness.Status.Failed"),
    cancelled: $msg("ReviewHarness.Status.Cancelled"),
};
const MODE_LABELS = {
    automatic: $msg("ReviewHarness.Mode.Automatic"),
    guided: $msg("ReviewHarness.Mode.Guided"),
} as const;
const ACCESS_LABELS = {
    "dedicated-vault-fixtures": $msg("ReviewHarness.Access.DedicatedVaultFixtures"),
    "device-local-state": $msg("ReviewHarness.Access.DeviceLocalState"),
    "read-only": $msg("ReviewHarness.Access.ReadOnly"),
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
        return $msg("ReviewHarness.Title");
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
                $msg("ReviewHarness.ScenarioSummary", {
                    description: scenario.description,
                    mode: MODE_LABELS[scenario.mode],
                    access: ACCESS_LABELS[scenario.access],
                })
            )
            .setClass("sls-review-harness__scenario");
        setting.settingEl.dataset.testid = `review-harness-scenario-${id}`;

        this.addActionButton(
            setting,
            id === "compatibility-review"
                ? $msg("ReviewHarness.Action.StartReview")
                : $msg("ReviewHarness.Action.Run"),
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
                $msg("ReviewHarness.Action.OpenCompatibilityReview"),
                "review-harness-open-compatibility-review",
                () => this.controller.openCompatibilityReview(),
                true
            );
            this.addActionButton(actions, $msg("ReviewHarness.Action.RestartAndReturn"), "review-harness-restart", () =>
                this.controller.prepareCompatibilityReviewRestart()
            );
        }
    }

    private render(): void {
        this.contentEl.empty();
        this.contentEl.addClass("sls-review-harness");
        this.contentEl.dataset.testid = "review-harness";
        this.contentEl.createEl("h2", { text: $msg("ReviewHarness.Title") });
        this.contentEl.createEl("p", {
            text: $msg("ReviewHarness.Warning"),
            cls: "sls-review-harness__warning",
        });
        this.contentEl.createEl("p", {
            text: $msg("ReviewHarness.Description"),
        });

        const snapshot = this.controller.snapshot();
        if (snapshot.continuationError) {
            this.contentEl.createEl("p", {
                text: $msg("ReviewHarness.ContinuationError", { error: snapshot.continuationError }),
                cls: "sls-review-harness__error",
            });
        } else if (snapshot.resumedRequestId) {
            const resumed = this.contentEl.createEl("p", {
                text: $msg("ReviewHarness.ContinuationConsumed"),
                cls: "sls-review-harness__resumed",
            });
            resumed.dataset.testid = "review-harness-resumed";
        }

        const suiteActions = new Setting(this.contentEl)
            .setName($msg("ReviewHarness.Suite.Title"))
            .setDesc(
                snapshot.running
                    ? $msg("ReviewHarness.Suite.Running", {
                          scenario: snapshot.current ?? $msg("ReviewHarness.Suite.Scenario"),
                      })
                    : $msg("ReviewHarness.Suite.ChooseScope")
            )
            .setClass("sls-review-harness__actions");
        this.addActionButton(suiteActions, $msg("ReviewHarness.Action.Automatic"), "review-harness-run-automatic", () =>
            this.controller.runAutomaticScenarios()
        );
        this.addActionButton(suiteActions, $msg("ReviewHarness.Action.FullReview"), "review-harness-run-full", () =>
            this.controller.runAllScenarios()
        );
        this.addActionButton(suiteActions, $msg("ReviewHarness.Action.CopyMarkdownReport"), "review-harness-copy-report", async () => {
            await this.controller.copyReport();
            new Notice($msg("ReviewHarness.ReportCopied"));
        });

        this.contentEl.createEl("h3", { text: $msg("ReviewHarness.Scenarios") });
        for (const { id } of REVIEW_HARNESS_SCENARIOS) this.renderScenario(id);

        this.contentEl.createEl("p", {
            text: $msg("ReviewHarness.Privacy"),
            cls: "sls-review-harness__privacy",
        });
    }
}
