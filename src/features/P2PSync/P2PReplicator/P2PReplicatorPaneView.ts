import { Menu, WorkspaceLeaf } from "@/deps.ts";
import ReplicatorPaneComponent from "./P2PReplicatorPane.svelte";
import { mount } from "svelte";
import { SvelteItemView } from "@/common/SvelteItemView.ts";

import { unique } from "octagonal-wheels/collection";
import { LOG_LEVEL_NOTICE, REMOTE_P2P } from "@vrtmrz/livesync-commonlib/compat/common/types";
import { Logger } from "@vrtmrz/livesync-commonlib/compat/common/logger";
import type { PeerStatus } from "@vrtmrz/livesync-commonlib/compat/replication/trystero/P2PReplicatorPaneCommon";
import type { LiveSyncBaseCore } from "@/LiveSyncBaseCore.ts";
import type { P2PPaneParams } from "@vrtmrz/livesync-commonlib/compat/replication/trystero/UseP2PReplicatorResult";
export const VIEW_TYPE_P2P = "p2p-replicator";

function addToList(item: string, list: string) {
    return unique(
        list
            .split(",")
            .map((e) => e.trim())
            .concat(item)
            .filter((p) => p)
    ).join(",");
}
function removeFromList(item: string, list: string) {
    return list
        .split(",")
        .map((e) => e.trim())
        .filter((p) => p !== item)
        .filter((p) => p)
        .join(",");
}

export class P2PReplicatorPaneView extends SvelteItemView {
    core: LiveSyncBaseCore;
    private _p2pResult: P2PPaneParams;
    override icon = "waypoints";
    title: string = "";
    override navigation = false;

    override getIcon(): string {
        return "waypoints";
    }
    get replicator() {
        return this._p2pResult.replicator;
    }
    async replicateFrom(peer: PeerStatus) {
        await this.replicator.replicateFrom(peer.peerId);
    }
    async replicateTo(peer: PeerStatus) {
        await this.replicator.requestSynchroniseToPeer(peer.peerId);
    }
    async getRemoteConfig(peer: PeerStatus) {
        Logger(
            `${peer.name} のリモート構成を要求しています。リモートデバイスでパスフレーズを入力してください`,
            LOG_LEVEL_NOTICE
        );
        const remoteConfig = await this.replicator.getRemoteConfig(peer.peerId);
        if (remoteConfig) {
            Logger(`${peer.name} のリモート構成を取得しました`);
            const DROP = "はい、ローカルデータベースを破棄します";
            const KEEP = "はい、ローカルデータベースは保持します";
            const CANCEL = "いいえ、キャンセルします";
            const yn = await this.core.confirm.askSelectStringDialogue(
                `リモート構成を本当に適用しますか？現在の構成はすぐに上書きされ、再起動します。
リモートデバイスから再構築するため、ローカルデータベースを破棄することもできます。`,
                [DROP, KEEP, CANCEL] as const,
                {
                    defaultAction: CANCEL,
                    title: "リモート構成を適用",
                }
            );
            if (yn === DROP || yn === KEEP) {
                if (yn === DROP) {
                    if (remoteConfig.remoteType !== REMOTE_P2P) {
                        const yn2 = await this.core.confirm.askYesNoDialog(
                            `リモート種別を "P2P Sync" に設定し、"P2P replication" で再構築しますか？`,
                            {
                                title: "リモートデバイスから再構築",
                            }
                        );
                        if (yn2 === "yes") {
                            remoteConfig.remoteType = REMOTE_P2P;
                            remoteConfig.P2P_RebuildFrom = peer.name;
                        }
                    }
                }

                // this.plugin.settings = remoteConfig;
                // await this.plugin.saveSettings();
                await this.core.services.setting.applyExternalSettings(remoteConfig);
                if (yn === DROP) {
                    await this.core.rebuilder.scheduleFetch();
                } else {
                    this.core.services.appLifecycle.scheduleRestart();
                }
            } else {
                Logger(`キャンセルしました\n${peer.name} のリモート構成は適用されません`, LOG_LEVEL_NOTICE);
            }
        } else {
            Logger(`${peer.peerId} のリモート構成を取得できません`);
        }
    }

    async toggleProp(peer: PeerStatus, prop: "syncOnConnect" | "watchOnConnect" | "syncOnReplicationCommand") {
        const settingMap = {
            syncOnConnect: "P2P_AutoSyncPeers",
            watchOnConnect: "P2P_AutoWatchPeers",
            syncOnReplicationCommand: "P2P_SyncOnReplication",
        } as const;

        const targetSetting = settingMap[prop];
        const currentSettingAll = this.core.services.setting.currentSettings();
        const currentSetting = {
            [targetSetting]: currentSettingAll ? currentSettingAll[targetSetting] : "",
        };
        if (peer[prop]) {
            // this.plugin.settings[targetSetting] = removeFromList(peer.name, this.plugin.settings[targetSetting]);
            // await this.plugin.saveSettings();
            currentSetting[targetSetting] = removeFromList(peer.name, currentSetting[targetSetting]);
        } else {
            currentSetting[targetSetting] = addToList(peer.name, currentSetting[targetSetting]);
        }
        await this.core.services.setting.applyPartial(currentSetting, true);
    }
    m?: Menu;
    constructor(leaf: WorkspaceLeaf, core: LiveSyncBaseCore, p2pResult: P2PPaneParams) {
        super(leaf);
        this.core = core;
        this._p2pResult = p2pResult;
    }

    private showPeerMenu(peer: PeerStatus, event: MouseEvent): void {
        this.m?.hide();
        this.m = new Menu()
            .addItem((item) => item.setTitle("📥 取得のみ").onClick(() => this.replicateFrom(peer)))
            .addItem((item) => item.setTitle("📤 送信のみ").onClick(() => this.replicateTo(peer)))
            .addSeparator()
            .addItem((item) => {
                item.setTitle("🔧 構成を取得").onClick(async () => {
                    await this.getRemoteConfig(peer);
                });
            })
            .addSeparator()
            .addItem((item) => {
                const mark = peer.syncOnConnect ? "checkmark" : null;
                item.setTitle("接続時の同期を切り替え")
                    .onClick(async () => {
                        await this.toggleProp(peer, "syncOnConnect");
                    })
                    .setIcon(mark);
            })
            .addItem((item) => {
                const mark = peer.watchOnConnect ? "checkmark" : null;
                item.setTitle("接続時の監視を切り替え")
                    .onClick(async () => {
                        await this.toggleProp(peer, "watchOnConnect");
                    })
                    .setIcon(mark);
            })
            .addItem((item) => {
                const mark = peer.syncOnReplicationCommand ? "checkmark" : null;
                item.setTitle("`Replicate now` コマンドでの同期を切り替え")
                    .onClick(async () => {
                        await this.toggleProp(peer, "syncOnReplicationCommand");
                    })
                    .setIcon(mark);
            });
        void this.m.showAtPosition({ x: event.x, y: event.y });
    }

    getViewType() {
        return VIEW_TYPE_P2P;
    }

    getDisplayText() {
        return "Peer-to-Peerレプリケーター";
    }

    override async onClose(): Promise<void> {
        await super.onClose();
        if (this.m) {
            this.m.hide();
        }
    }
    instantiateComponent(target: HTMLElement) {
        return mount(ReplicatorPaneComponent, {
            target: target,
            props: {
                host: {
                    services: this.core.services,
                    p2p: this._p2pResult,
                    showPeerMenu: (peer: PeerStatus, event: MouseEvent) => this.showPeerMenu(peer, event),
                },
            },
        });
    }
}
