// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import type { LiveSyncCore } from "@/main";
import { AbstractModule } from "@/modules/AbstractModule";
export declare class ModuleBasicMenu extends AbstractModule {
    _everyOnloadStart(): Promise<boolean>;
    onBindFunction(core: LiveSyncCore, services: typeof core.services): void;
}
