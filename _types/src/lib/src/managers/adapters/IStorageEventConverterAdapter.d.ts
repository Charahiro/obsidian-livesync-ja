// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import type { FilePath, UXFileInfoStub, UXInternalFileInfoStub } from "@lib/common/types";
/**
 * Adapter interface for converting platform-specific file types to UX types
 *
 * @template TFile - Platform-specific file type
 */
export interface IStorageEventConverterAdapter<TFile> {
    /**
     * Convert platform-specific file to UXFileInfoStub
     */
    toFileInfo(file: TFile, deleted?: boolean): UXFileInfoStub;
    /**
     * Convert path to UXInternalFileInfoStub
     */
    toInternalFileInfo(path: FilePath): UXInternalFileInfoStub;
}
