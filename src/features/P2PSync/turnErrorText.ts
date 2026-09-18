import { uiText } from "@/common/uiText";
import { translateIfAvailable } from "@/common/translation";

/** Localise provider validation messages only at the user-interface boundary. */
export function localiseTurnError(message: string): string {
    switch (message) {
        case "Enter a TURN Key ID.":
            return uiText("Enter a TURN Key ID.", "TURNキーIDを入力してください。");
        case "TURN Key ID contains unsupported characters.":
            return uiText(
                "TURN Key ID contains unsupported characters.",
                "TURNキーIDに使用できない文字が含まれています。"
            );
        case "Enter a TURN Key API Token.":
            return uiText("Enter a TURN Key API Token.", "TURNキーのAPIトークンを入力してください。");
        case "TURN Key API Token must use Bearer token syntax.":
            return uiText(
                "TURN Key API Token must use Bearer token syntax.",
                "TURNキーのAPIトークンはBearerトークンの形式にしてください。"
            );
        case "The selected TURN configuration is not supported.":
            return uiText(
                "The selected TURN configuration is not supported.",
                "選択したTURN設定には対応していません。"
            );
        case "The Cloudflare TURN configuration is invalid.":
            return uiText("The Cloudflare TURN configuration is invalid.", "Cloudflare TURNの設定が無効です。");
        case "The Cloudflare TURN credential request was not authorised.":
            return uiText(
                "The Cloudflare TURN credential request was not authorised.",
                "Cloudflare TURNの認証情報の取得が許可されませんでした。"
            );
        case "The Cloudflare TURN service is unavailable.":
            return uiText("The Cloudflare TURN service is unavailable.", "Cloudflare TURNサービスを利用できません。");
        case "The Cloudflare TURN service returned an invalid response.":
            return uiText(
                "The Cloudflare TURN service returned an invalid response.",
                "Cloudflare TURNサービスから無効な応答が返されました。"
            );
        default:
            return translateIfAvailable(message);
    }
}
