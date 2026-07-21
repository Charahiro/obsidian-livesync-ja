// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import { APIService } from "@lib/services/base/APIService";
import type { ServiceContext } from "@lib/services/base/ServiceBase";
export declare abstract class InjectableAPIService<T extends ServiceContext> extends APIService<T> {
    addLog: import("@lib/services/lib/HandlerUtils").HandlerFunction<(message: unknown, level: import("octagonal-wheels/common/logger").LOG_LEVEL, key?: string) => void, unknown>;
    getPlatform(): string;
    getCrypto(): Crypto;
}
