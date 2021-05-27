import { call } from "when/node";
import * as opencage from "opencage-api-client";

export class GeocodingControl {

    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: string[]) => void): void {
        if (!l) return callback([ "Invalid location." ]);
        
        opencage
            .geocode({ q: `${l.lat},${l.lng}`, key: this.apiKey})
            .then((data) => {
                console.log('reverse geocode  -------------------------');
                console.log(data.results[0]);

                return callback([ data.results[0].formatted ]);
            })
            .catch((error) => {
              console.log('error', error.message);
            });
    }

    geocode(searchString: string, callback: (results: { 
            description: string,
            location: { lng: number; lat: number}
        }[]) => void) {
        
        opencage
            .geocode({ q: searchString, key: this.apiKey })
            .then((data) => {
                console.log('reverse geocode  -------------------------');
                console.log(data.results[0]);

                const results = [];
                data.results.forEach(r => {
                    results.push({
                        description: r.formatted,
                        location: r.geometry
                    });
                });
                
                callback(results);
            })
            .catch((error) => {
              console.log('error', error.message);
            });
    }
}