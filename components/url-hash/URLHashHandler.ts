import { UrlHash } from "@anyways-open/url-hash";

export class UrlParamHandler {

    private state?: any = undefined;
    private callbacks: { callback: (state: any) => void }[] = [];

    constructor() {

    }

    public onUpdated(callback: (state: any) => void): void {
        this.callbacks.push({ callback: callback });
    }

    public update(state: any) {
        this.state = {
            ...this.state,
            ...state
        };

        Object.keys(this.state).forEach(k => {
            const val = this.state[k];

            if (!val) {
                delete this.state[k];
            }
        });

        UrlHash.write(this.state);
    }

    public getState(): any {
        if (!this.state) {
            this.state = UrlHash.read();
        }
        return this.state;
    }
}