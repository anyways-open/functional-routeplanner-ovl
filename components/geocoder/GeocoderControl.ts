import { IProvider } from "./Providers/IProvider";

export class GeocodingControl {

    private provider: IProvider;

    constructor(provider: IProvider) {
        this.provider = provider;
    }

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: string[]) => void): void {
        this.provider.reverse(l, callback);
    }

    geocode(searchString: string, callback: (results: { 
            description: string,
            location: { lng: number; lat: number}
        }[]) => void) {
        this.provider.forward(searchString, callback);
    }
}