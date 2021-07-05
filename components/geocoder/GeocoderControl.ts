import { IForwardQuery } from "./IForwardQuery";
import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./Providers/IProvider";

export class GeocodingControl {

    private provider: IProvider;

    constructor(provider: IProvider) {
        this.provider = provider;
    }

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: string[]) => void): void {
        this.provider.reverse(l, callback);
    }

    geocode(query: IForwardQuery, callback: (results: IForwardResult[]) => void) {
        this.provider.forward(query, callback);
    }
}