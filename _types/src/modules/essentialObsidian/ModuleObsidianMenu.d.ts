// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import type { LiveSyncCore } from "@/main.ts";
import { AbstractModule } from "@/modules/AbstractModule.ts";
export declare class ModuleObsidianMenu extends AbstractModule {
    _everyOnloadStart(): Promise<boolean>;
    onBindFunction(core: LiveSyncCore, services: typeof core.services): void;
}
