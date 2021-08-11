import { UrlHash } from "@anyways-open/url-hash";

export class UrlHashHandler {

    private key: string;

    private static state: any = undefined;
    private static stateDirty: boolean = false;
    private static updateTimer = setInterval(() => {
        if (!UrlHashHandler.stateDirty) return;

        UrlHash.write(UrlHashHandler.state);
        UrlHashHandler.stateDirty = false;
    }, 500);

    constructor(key: string) {
        this.key = key;

        if (typeof UrlHashHandler.state === "undefined") {
            UrlHashHandler.state = UrlHash.read();
        }
    }

    public update(value?: string) {
        const currentValue = UrlHashHandler.state[this.key];
        if (currentValue === value) return;

        if (typeof value === "undefined") {
            delete UrlHashHandler.state[this.key];
        } else {
            UrlHashHandler.state[this.key] = value;
        }

        UrlHashHandler.stateDirty = true;
    }

    public getState(): string {
        return UrlHashHandler.state[this.key];
    }
}