// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import type { ReactiveSource } from "octagonal-wheels/dataobject/reactive_v2";
import type { LiveSyncTrysteroReplicator } from "./LiveSyncTrysteroReplicator";
import type { P2PLogCollector } from "./P2PLogCollector";
export type UseP2PReplicatorResult = {
    replicator: LiveSyncTrysteroReplicator;
};
export type P2PPaneParams = {
    replicator: LiveSyncTrysteroReplicator;
    p2pLogCollector: P2PLogCollector;
    storeP2PStatusLine: ReactiveSource<string>;
};
