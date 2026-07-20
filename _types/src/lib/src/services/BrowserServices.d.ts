// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import { InjectableVaultServiceCompat } from "@lib/services/implements/injectable/InjectableVaultService";
import { ServiceContext } from "@lib/services/base/ServiceBase";
import { InjectableServiceHub } from "@lib/services/implements/injectable/InjectableServiceHub";
export declare class BrowserServiceHub<T extends ServiceContext> extends InjectableServiceHub<T> {
    get vault(): InjectableVaultServiceCompat<T>;
    constructor();
}
