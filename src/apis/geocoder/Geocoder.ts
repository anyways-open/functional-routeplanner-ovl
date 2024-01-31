import type { IForwardQuery } from "./IForwardQuery";
import type { IForwardResult } from "./IForwardResult";
import type { IProvider } from "./Providers/IProvider";
import type { IReverseResult } from "./Providers/IReverseResult";

export class Geocoder {

    private provider: IProvider;
    private forwardPreprocessor?: (query: IForwardQuery) => IForwardQuery;

    constructor(provider: IProvider, settings?: { 
        forwardPreprocessor?:  (query: IForwardQuery) => IForwardQuery 
    }) {
        this.provider = provider;

        this.forwardPreprocessor = settings?.forwardPreprocessor;
    }

    private abortController?: AbortController;

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: IReverseResult[]) => void): void {
        this.provider.reverse(l, callback);
    }

    async geocode(query: IForwardQuery): Promise<IForwardResult[]> {
        if (this.forwardPreprocessor) {
            query = this.forwardPreprocessor(query);
        }

        query.string = query.string ?? "";
        query.string = query.string.trim();


        if (typeof this.abortController !== "undefined") {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        if (query.string.length == 0) {
            return [];
        }

        return await this.provider.forward(query, {
            signal: signal
        });
    }
}