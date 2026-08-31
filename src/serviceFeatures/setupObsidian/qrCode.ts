import type { NecessaryServices } from "@vrtmrz/livesync-commonlib/compat/interfaces/ServiceModule";
import {
    encodeQR,
    encodeSettingsToQRCodeData,
    OutputFormat,
} from "@vrtmrz/livesync-commonlib/compat/API/processSetting";
import { EVENT_REQUEST_SHOW_SETUP_QR } from "@vrtmrz/livesync-commonlib/compat/events/coreEvents";
import { fireAndForget } from "@vrtmrz/livesync-commonlib/compat/common/utils";
import type { SetupFeatureHost } from "./types";
import { $msg } from "@/common/translation";

export async function encodeSetupSettingsAsQR(host: SetupFeatureHost) {
    const settingString = encodeSettingsToQRCodeData(host.services.setting.currentSettings());
    const result = encodeQR(settingString, OutputFormat.SVG);
    if (result === "") {
        return "";
    }

    if (typeof result === "string") {
        const msg = host.services.context.translate("Setup.QRCode", { qr_image: result });
        await host.services.UI.confirm.confirmWithMessage(`設定QRコード`, msg, ["OK"], "OK");
        return result;
    } else {
        // Multi-page QR code
        let currentIndex = 0;
        while (currentIndex < result.total) {
            const msg =
                `設定が1つのQRコードに収まらないため、複数のQRコードを結合します。設定はこのデバイス内だけで処理され、サーバーへ送信されません。モバイルのカメラでQRコードを読み取り、ブラウザーでページを開いてください。すべての部分を収集すると、結合した設定を使ってObsidianへ戻ります。進捗：${`${currentIndex + 1}`} / ${`${result.total}`}` + `\n\n${result.parts[currentIndex]}`;

            const back = $msg("Back");
            const next = `次へ`;
            const cancel = $msg("Cancel");
            const done = `完了`;
            const buttons = [];
            if (currentIndex > 0) buttons.push(back);
            if (currentIndex < result.total - 1) {
                buttons.push(next);
                buttons.push(cancel);
            } else {
                buttons.push(done);
            }

            const choice = await host.services.UI.confirm.confirmWithMessage(
                `設定QRコード（分割）`,
                msg,
                buttons,
                buttons[buttons.indexOf(next) !== -1 ? buttons.indexOf(next) : buttons.indexOf(done)]
            );

            if (choice === next) {
                currentIndex++;
            } else if (choice === back) {
                currentIndex--;
            } else {
                break;
            }
        }
        return result.parts[0]; // Return the first one for compatibility
    }
}

export function useSetupQRCodeFeature(host: NecessaryServices<"API" | "UI" | "setting" | "appLifecycle", never>) {
    host.services.appLifecycle.onLoaded.addHandler(() => {
        host.services.API.addCommand({
            id: "livesync-setting-qr",
            name: `設定をQRコードで表示`,
            checkCallback: (checking) => {
                if (!host.services.setting.currentSettings().isConfigured) return false;
                if (!checking) fireAndForget(encodeSetupSettingsAsQR(host));
                return true;
            },
        });
        host.services.context.events.onEvent(EVENT_REQUEST_SHOW_SETUP_QR, () =>
            fireAndForget(() => encodeSetupSettingsAsQR(host))
        );
        return Promise.resolve(true);
    });
}
