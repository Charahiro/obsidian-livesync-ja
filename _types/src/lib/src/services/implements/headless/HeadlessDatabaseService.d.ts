// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import { KeyValueDBService } from "@lib/services/base/KeyValueDBService";
import type { ServiceContext } from "@lib/services/base/ServiceBase";
import { DatabaseService } from "@lib/services/base/DatabaseService.ts";
export declare class HeadlessDatabaseService<T extends ServiceContext> extends DatabaseService<T> {
}
export declare class HeadlessKeyValueDBService<T extends ServiceContext> extends KeyValueDBService<T> {
}
