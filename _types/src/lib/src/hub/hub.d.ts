// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import { EventHub } from "octagonal-wheels/events";
declare global {
    interface LSEvents {
        hello: string;
        world: undefined;
    }
}
export declare const eventHub: EventHub<LSEvents>;
