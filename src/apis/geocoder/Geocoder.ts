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

    requestId: number = 1;

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: IReverseResult[]) => void): void {
        this.provider.reverse(l, callback);
    }

    geocode(query: IForwardQuery, callback: (results: IForwardResult[]) => void) {
        if (this.forwardPreprocessor) {
            query = this.forwardPreprocessor(query);
        }

        query.string = query.string ?? "";
        query.string = query.string.trim();

        this.requestId++;
        const requestId = this.requestId;

        if (query.string.length == 0) {
            callback([]);
            return;
        }

        this.provider.forward(query, rs => {
            if (this.requestId != requestId) {
                console.log(`result not latest: ${this.requestId} vs ${requestId}`);
                return;
            }
            console.log(`result latest: ${this.requestId}`);

            callback(rs);
        });
    }
}