import { App, Modal } from "@/deps.ts";
import { DIFF_DELETE, DIFF_EQUAL, DIFF_INSERT } from "diff-match-patch";
import {
    CANCELLED,
    LEAVE_TO_SUBSEQUENT,
    type diff_result,
    type FilePathWithPrefix,
} from "@vrtmrz/livesync-commonlib/compat/common/types";
import { EVENT_CONFLICT_CANCELLED, EVENT_PLUGIN_UNLOADED, eventHub } from "@/common/events.ts";
import { $msg } from "@/common/translation.ts";
import { uiText } from "@/common/uiText.ts";
import { promiseWithResolvers } from "octagonal-wheels/promises";
import { POSTPONED, type MergeDialogResult } from "@/serviceFeatures/interactiveConflictResolution/types";

export { POSTPONED, type MergeDialogResult };

export type ConflictResolveModalOptions = {
    readOnly?: boolean;
    title?: string;
    localName?: string;
    remoteName?: string;
};

export class ConflictResolveModal extends Modal {
    result: diff_result;
    filename: FilePathWithPrefix;

    response: MergeDialogResult = CANCELLED;
    isClosed = false;
    consumed = false;
    private readonly resultPromise = promiseWithResolvers<MergeDialogResult>();

    title: string = uiText("Conflicting changes", "競合した変更");

    pluginPickMode: boolean = false;
    readOnly: boolean = false;
    localName: string = uiText("Base", "基準");
    remoteName: string = uiText("Conflicted", "競合");
    private eventSubscriptions?: AbortController;
    currentDiffIndex = -1;
    diffView!: HTMLDivElement;
    diffNavIndicator!: HTMLSpanElement;

    constructor(
        app: App,
        filename: FilePathWithPrefix,
        diff: diff_result,
        pluginPickMode?: boolean,
        remoteName?: string,
        options?: ConflictResolveModalOptions
    ) {
        super(app);
        this.result = diff;
        this.filename = filename;
        this.pluginPickMode = pluginPickMode || false;
        this.readOnly = options?.readOnly ?? false;
        if (this.pluginPickMode) {
            this.title = uiText("Pick a version", "バージョンを選択");
            this.remoteName = `${remoteName || uiText("Remote", "リモート")}`;
            this.localName = uiText("Local", "ローカル");
        } else if (this.readOnly) {
            this.title = options?.title ?? uiText("Vault and database revision", "Vault とデータベースのリビジョン");
            this.localName = options?.localName ?? uiText("Vault file", "Vault ファイル");
            this.remoteName = options?.remoteName ?? uiText("Database revision", "データベースのリビジョン");
        }
    }

    appendDiffFragment(container: HTMLDivElement, text: string, cls: string) {
        const lines = text.split("\n");
        lines.forEach((line, index) => {
            const span = container.createSpan({ cls });
            span.setText(line);
            if (index < lines.length - 1) {
                container.createSpan({ cls: "ls-mark-cr" });
                container.createEl("br");
            }
        });
    }

    appendVersionInfo(container: HTMLDivElement, cls: string, name: string, date: string) {
        const line = container.createSpan({ cls });
        line.createSpan({ text: name, cls: "conflict-dev-name" });
        line.appendText(`: ${date}`);
        container.createEl("br");
    }

    navigateDiff(direction: "prev" | "next") {
        const diffElements = this.diffView.querySelectorAll(".added, .deleted");
        if (diffElements.length === 0) return;

        const prevFocused = this.diffView.querySelector(".diff-focused");
        if (prevFocused) {
            prevFocused.classList.remove("diff-focused");
        }

        if (direction === "next") {
            this.currentDiffIndex = (this.currentDiffIndex + 1) % diffElements.length;
        } else {
            this.currentDiffIndex = this.currentDiffIndex <= 0 ? diffElements.length - 1 : this.currentDiffIndex - 1;
        }

        const target = diffElements[this.currentDiffIndex];
        target.classList.add("diff-focused");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        this.diffNavIndicator.setText(`${this.currentDiffIndex + 1}/${diffElements.length}`);
    }

    resetDiffNavigation() {
        this.currentDiffIndex = -1;
        const diffElements = this.diffView.querySelectorAll(".added, .deleted");
        this.diffNavIndicator.setText(diffElements.length > 0 ? `0/${diffElements.length}` : "\u2014");
    }

    override onOpen() {
        const { contentEl } = this;
        this.eventSubscriptions?.abort();
        const eventSubscriptions = new AbortController();
        this.eventSubscriptions = eventSubscriptions;
        eventHub.onceEvent(
            EVENT_PLUGIN_UNLOADED,
            () => {
                this.sendResponse(CANCELLED);
            },
            { signal: eventSubscriptions.signal }
        );
        if (!this.readOnly) {
            // Cancel an older dialogue for this path before subscribing this
            // instance. Emitting after subscription would close the replacement
            // itself; the instance-owned result promise then completes the older
            // caller even when it only begins waiting after this event.
            eventHub.emitEvent(EVENT_CONFLICT_CANCELLED, this.filename);
            eventHub.onEvent(
                EVENT_CONFLICT_CANCELLED,
                (path) => {
                    if (path === this.filename) {
                        this.sendResponse(CANCELLED);
                    }
                },
                { signal: eventSubscriptions.signal }
            );
        }
        this.titleEl.setText(this.title);
        contentEl.empty();
        const diffOptionsRow = contentEl.createDiv("");
        diffOptionsRow.addClass("diff-options-row");
        diffOptionsRow.createSpan({ text: this.filename });

        const diffNavContainer = diffOptionsRow.createDiv("");
        diffNavContainer.addClass("diff-nav");
        diffNavContainer.createEl("button", { text: `\u25B2 ${uiText("Prev", "前へ")}` }, (e) => {
            e.addClass("diff-nav-btn");
            e.addEventListener("click", () => this.navigateDiff("prev"));
        });
        diffNavContainer.createEl("button", { text: `\u25BC ${uiText("Next", "次へ")}` }, (e) => {
            e.addClass("diff-nav-btn");
            e.addEventListener("click", () => this.navigateDiff("next"));
        });
        this.diffNavIndicator = diffNavContainer.createSpan({ text: "\u2014" });
        this.diffNavIndicator.addClass("diff-nav-indicator");

        this.diffView = contentEl.createDiv("");
        this.diffView.addClass("op-scrollable");
        this.diffView.addClass("ls-dialog");
        let diffLength = 0;
        for (const v of this.result.diff) {
            const x1 = v[0];
            const x2 = v[1];
            diffLength += x2.length;
            if (diffLength > 100 * 1024) {
                continue;
            }
            if (x1 == DIFF_DELETE) {
                this.appendDiffFragment(this.diffView, x2, "deleted");
            } else if (x1 == DIFF_EQUAL) {
                this.appendDiffFragment(this.diffView, x2, "normal");
            } else if (x1 == DIFF_INSERT) {
                this.appendDiffFragment(this.diffView, x2, "added");
            }
        }

        const div2 = contentEl.createDiv("");
        div2.addClass("ls-dialog");
        const date1 =
            new Date(this.result.left.mtime).toLocaleString() + (this.result.left.deleted ? ` (${uiText("Deleted", "削除済み")})` : "");
        const date2 =
            new Date(this.result.right.mtime).toLocaleString() + (this.result.right.deleted ? ` (${uiText("Deleted", "削除済み")})` : "");
        this.appendVersionInfo(div2, "deleted", this.localName, date1);
        this.appendVersionInfo(div2, "added", this.remoteName, date2);
        const actionContainer = contentEl.createDiv("conflict-action-container");
        if (this.readOnly) {
            actionContainer.createEl("button", { text: $msg("Close") }, (e) => {
                e.addClass("conflict-action-button");
                e.addEventListener("click", () => this.sendResponse(CANCELLED));
            });
        } else {
            actionContainer.createEl("button", { text: `${uiText("Use this version", "このバージョンを使用")}: ${this.localName}` }, (e) => {
                e.addClass("conflict-action-button");
                e.addEventListener("click", () => this.sendResponse(this.result.right.rev));
            });
            actionContainer.createEl("button", { text: `${uiText("Use this version", "このバージョンを使用")}: ${this.remoteName}` }, (e) => {
                e.addClass("conflict-action-button");
                e.addEventListener("click", () => this.sendResponse(this.result.left.rev));
            });
            if (!this.pluginPickMode) {
                actionContainer.createEl("button", { text: uiText("Concat both", "両方を連結") }, (e) => {
                    e.addClass("conflict-action-button");
                    e.addEventListener("click", () => this.sendResponse(LEAVE_TO_SUBSEQUENT));
                });
            }
            actionContainer.createEl(
                "button",
                { text: !this.pluginPickMode ? $msg("Not now") : $msg("Cancel") },
                (e) => {
                e.addClass("conflict-action-button");
                e.addEventListener("click", () => this.sendResponse(this.pluginPickMode ? CANCELLED : POSTPONED));
                }
            );
        }
        if (diffLength > 100 * 1024) {
            this.diffView.empty();
            this.diffView.setText(uiText("(Too large diff to display)", "（差分が大きすぎるため表示できません）"));
        }
        this.resetDiffNavigation();
        this.navigateDiff("next");
    }

    sendResponse(result: MergeDialogResult) {
        this.response = result;
        this.close();
    }

    override onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.eventSubscriptions?.abort();
        this.eventSubscriptions = undefined;
        if (this.consumed) {
            return;
        }
        this.consumed = true;
        this.resultPromise.resolve(this.response);
    }

    async waitForResult(): Promise<MergeDialogResult> {
        return await this.resultPromise.promise;
    }
}
