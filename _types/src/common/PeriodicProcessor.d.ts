// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
import type { NecessaryServices } from "@lib/interfaces/ServiceModule";
type PeriodicProcessorHost = NecessaryServices<"API" | "control", never>;
export declare class PeriodicProcessor {
    _process: () => Promise<unknown>;
    _timer?: number;
    _core: PeriodicProcessorHost;
    constructor(core: PeriodicProcessorHost, process: () => Promise<unknown>);
    process(): Promise<void>;
    enable(interval: number): void;
    disable(): void;
}
export {};
