// @ts-nocheck
// REPO: https://github.com/Charahiro/livesync-commonlib-ja  Commit hash: 06cffbc
export declare class WrappedNotice {
    constructor(message: string | DocumentFragment, timeout?: number);
    setMessage(message: string | DocumentFragment): this;
    hide(): void;
}
export declare function setNoticeClass(notice: typeof WrappedNotice): void;
export declare function NewNotice(message: string | DocumentFragment, timeout?: number): WrappedNotice;
