// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import { type TFile } from "@/deps.ts";
import type { FilePathWithPrefix, DocumentID } from "@lib/common/types.ts";
import { AbstractObsidianModule } from "@/modules/AbstractObsidianModule.ts";
export declare class ModuleObsidianDocumentHistory extends AbstractObsidianModule {
    _everyOnloadStart(): Promise<boolean>;
    showHistory(file: TFile | FilePathWithPrefix, id?: DocumentID): void;
    fileHistory(): Promise<void>;
    onBindFunction(core: typeof this.core, services: typeof core.services): void;
}
