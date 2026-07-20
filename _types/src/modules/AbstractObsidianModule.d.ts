// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import type { LiveSyncCore } from "@/main";
import type ObsidianLiveSyncPlugin from "@/main";
import { AbstractModule } from "./AbstractModule.ts";
export declare abstract class AbstractObsidianModule extends AbstractModule {
    plugin: ObsidianLiveSyncPlugin;
    get app(): import("obsidian").App;
    constructor(plugin: ObsidianLiveSyncPlugin, core: LiveSyncCore);
    isThisModuleEnabled(): boolean;
}
