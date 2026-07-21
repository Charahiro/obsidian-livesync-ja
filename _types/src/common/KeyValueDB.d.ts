// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
import type { KeyValueDatabase } from "@lib/interfaces/KeyValueDatabase.ts";
export { OpenKeyValueDatabase } from "./KeyValueDBv2.ts";
export declare const _OpenKeyValueDatabase: (dbKey: string) => Promise<KeyValueDatabase>;
