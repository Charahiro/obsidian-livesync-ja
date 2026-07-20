// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
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
