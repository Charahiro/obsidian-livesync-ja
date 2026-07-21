// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
export interface Rebuilder {
    $performRebuildDB(method: "localOnly" | "remoteOnly" | "rebuildBothByThisDevice" | "localOnlyWithChunks"): Promise<void>;
    $rebuildRemote(): Promise<void>;
    $rebuildEverything(): Promise<void>;
    $fetchLocal(makeLocalChunkBeforeSync?: boolean, preventMakeLocalFilesBeforeSync?: boolean): Promise<void>;
    $fetchLocalDBFast(autoResume: boolean): Promise<void>;
    scheduleRebuild(): Promise<void>;
    scheduleFetch(): Promise<void>;
    /**
     * Declares the finish of the rebuild process and unlock remote, resume reflecting the changes.
     */
    finishRebuild(): Promise<void>;
}
