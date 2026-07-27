import type { ReviewHarnessScenarioResult } from "./reviewHarnessTypes";
import { $msg } from "@/common/translation";

export const REVIEW_HARNESS_FIXTURE_ROOT = "__self-hosted-livesync-review-harness__";
export const REVIEW_HARNESS_SOURCE_FILE = `${REVIEW_HARNESS_FIXTURE_ROOT}/round-trip.md`;
export const REVIEW_HARNESS_RENAMED_FILE = `${REVIEW_HARNESS_FIXTURE_ROOT}/round-trip-renamed.md`;

const CREATED_CONTENT = "review-harness:created\n";
const MODIFIED_CONTENT = "review-harness:modified\n";

export interface ReviewHarnessVaultFixtureRuntime<TFile> {
    confirmFixtureAccess(): Promise<boolean>;
    fixtureRootExists(): boolean;
    createFixtureRoot(): Promise<void>;
    createFile(path: string, content: string): Promise<TFile>;
    readFile(file: TFile): Promise<string>;
    modifyFile(file: TFile, content: string): Promise<void>;
    renameFile(file: TFile, path: string): Promise<void>;
    filePath(file: TFile): string;
    removeFixtureRoot(): Promise<void>;
}

/**
 * Exercises a single, fixed fixture tree in a dedicated Vault.
 *
 * The runtime owns the platform adapter. This function owns the safety boundary:
 * it refuses a pre-existing fixture root, tracks whether it created the root, and
 * removes only that owned root in a `finally` block.
 */
export async function runReviewHarnessVaultRoundTrip<TFile>(
    runtime: ReviewHarnessVaultFixtureRuntime<TFile>
): Promise<ReviewHarnessScenarioResult> {
    if (!(await runtime.confirmFixtureAccess())) {
        return {
            status: "cancelled",
            detail: $msg("ReviewHarness.VaultFixture.NotApproved"),
            observations: [],
        };
    }

    if (runtime.fixtureRootExists()) {
        return {
            status: "failed",
            detail: $msg("ReviewHarness.VaultFixture.AlreadyExists"),
            observations: [],
        };
    }

    let fixtureOwned = false;
    try {
        await runtime.createFixtureRoot();
        fixtureOwned = true;
        const file = await runtime.createFile(REVIEW_HARNESS_SOURCE_FILE, CREATED_CONTENT);
        const created = await runtime.readFile(file);
        if (created !== CREATED_CONTENT) throw new Error($msg("ReviewHarness.VaultFixture.Error.CreatedContent"));

        await runtime.modifyFile(file, MODIFIED_CONTENT);
        const modified = await runtime.readFile(file);
        if (modified !== MODIFIED_CONTENT) throw new Error($msg("ReviewHarness.VaultFixture.Error.ModifiedContent"));

        await runtime.renameFile(file, REVIEW_HARNESS_RENAMED_FILE);
        if (runtime.filePath(file) !== REVIEW_HARNESS_RENAMED_FILE) {
            throw new Error($msg("ReviewHarness.VaultFixture.Error.RenamePath"));
        }
        const renamed = await runtime.readFile(file);
        if (renamed !== MODIFIED_CONTENT) throw new Error($msg("ReviewHarness.VaultFixture.Error.RenamedContent"));

        return {
            status: "passed",
            detail: $msg("ReviewHarness.VaultFixture.Completed"),
            observations: ["create", "read", "modify", "rename", "read-after-rename", "cleanup"],
        };
    } finally {
        if (fixtureOwned) await runtime.removeFixtureRoot();
    }
}
