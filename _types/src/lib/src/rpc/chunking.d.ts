// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 40ac272
export declare function estimateBytes(text: string): number;
export declare function splitIntoChunks(payload: string, maxBytes: number): string[];
export declare class IncomingChunkBuffer {
    total: number;
    parts: Map<number, string>;
    constructor(total: number);
    add(index: number, payload: string): void;
    missingIndices(): number[];
    isComplete(): boolean;
    toPayload(): string;
}
