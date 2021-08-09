import { UrlHash } from "@anyways-open/url-hash";

export class UrlHashHandler {

    private key: string;

    constructor(key: string) {
        this.key = key;
    }

    public update(value?: string) {
        const state = UrlHash.read();

        state[this.key] = value;

        UrlHash.write(state);
    }

    public getState(): string {
        const state = UrlHash.read();

        return state[this.key];
    }
}