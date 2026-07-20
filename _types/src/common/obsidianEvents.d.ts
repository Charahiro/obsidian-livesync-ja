// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import type { TFile } from "@/deps";
import type { FilePathWithPrefix, LoadedEntry } from "@lib/common/types";
export declare const EVENT_REQUEST_SHOW_HISTORY = "show-history";
declare global {
    interface LSEvents {
        [EVENT_REQUEST_SHOW_HISTORY]: {
            file: TFile;
            fileOnDB: LoadedEntry;
        } | {
            file: FilePathWithPrefix;
            fileOnDB: LoadedEntry;
        };
    }
}
