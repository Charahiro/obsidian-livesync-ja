// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
/**
 * Adapter interface for status update operations
 */
export interface IStorageEventStatusAdapter {
    /**
     * Update the status display
     */
    updateStatus(status: {
        batched: number;
        processing: number;
        totalQueued: number;
    }): void;
}
