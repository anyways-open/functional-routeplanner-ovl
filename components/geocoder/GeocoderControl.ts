import { call } from "when/node";
import { IForwardQuery } from "./IForwardQuery";
import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./Providers/IProvider";
import { IReverseResult } from "./Providers/IReverseResult";

export class GeocodingControl {

    private provider: IProvider;
    private forwardPreprocessor?: (query: IForwardQuery) => IForwardQuery;

    constructor(provider: IProvider, settings?: { 
        forwardPreprocessor?:  (query: IForwardQuery) => IForwardQuery 
    }) {
        this.provider = provider;

        this.forwardPreprocessor = settings?.forwardPreprocessor;
    }

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: IReverseResult[]) => void): void {
        this.provider.reverse(l, callback);
    }

    geocode(query: IForwardQuery, callback: (results: IForwardResult[]) => void) {
        if (this.forwardPreprocessor) {
            query = this.forwardPreprocessor(query);
        }

        query.string = query.string ?? "";
        query.string = query.string.trim();

        if (query.string.length == 0) {
            callback([]);
            return;
        }

        this.provider.forward(query, callback);
    }
}