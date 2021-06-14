import * as opencage from "opencage-api-client";
import { IProvider } from "./IProvider";

export class OpenCageDataProvider implements IProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    forward(query: string, callback: (results: { description: string; location: { lng: number; lat: number; }; }[]) => void): void {
        opencage
            .geocode({ q: query, key: this.apiKey })
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

    reverse(l: { lng: number; lat: number; }, callback: (results: string[]) => void): void {
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
}