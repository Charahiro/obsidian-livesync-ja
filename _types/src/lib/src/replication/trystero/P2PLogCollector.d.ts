// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import type { P2PReplicationProgress } from "./TrysteroReplicator";
export declare class P2PLogCollector {
    constructor();
    p2pReplicationResult: Map<string, P2PReplicationProgress>;
    updateP2PReplicationLine(): void;
    p2pReplicationLine: import("octagonal-wheels/dataobject/reactive_v2").ReactiveSource<string>;
}
