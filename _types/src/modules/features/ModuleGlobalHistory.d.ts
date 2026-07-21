// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import { AbstractObsidianModule } from "@/modules/AbstractObsidianModule.ts";
export declare class ModuleObsidianGlobalHistory extends AbstractObsidianModule {
    _everyOnloadStart(): Promise<boolean>;
    showGlobalHistory(): void;
    onBindFunction(core: typeof this.core, services: typeof core.services): void;
}
