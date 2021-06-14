import { IProvider } from "./IProvider";

export class ChainedProvider implements IProvider {
    private providers: IProvider[] = [];

    constructor(providers: IProvider[]) {
        this.providers = providers;
    }

    forward(query: string, callback: (results: { description: string; location: { lng: number; lat: number; }; }[]) => void): void {
        this.forwardWith(0, query, callback);
    }

    private forwardWith(p: number, query: string, callback: (results: { description: string; location: { lng: number; lat: number; }; }[]) => void): void { 
        const provider = this.providers[p];

        provider.forward(query, result => {
            console.log("" + p + " ");
            console.log(result);
            if (result && result.length > 0) {
                callback(result);
            } else {
                // move to next provider.
                if (p == this.providers.length) {
                    callback([]);
                } else {
                    this.forwardWith(p + 1, query, callback);
                }
            }
        });
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: string[]) => void): void {
        this.reverseWith(0, l, callback);
    }

    private reverseWith(p: number, l: { lng: number; lat: number; }, callback: (results: string[]) => void): void { 
        const provider = this.providers[p];

        provider.reverse(l, result => {
            if (result && result.length > 0) {
                callback(result);
            } else {
                // move to next provider.
                if (p == this.providers.length) {
                    callback([]);
                } else {
                    this.reverseWith(p + 1, l, callback);
                }
            }
        });
    }
}