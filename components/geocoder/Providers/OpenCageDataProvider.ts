import * as opencage from "opencage-api-client";
import { IForwardQuery } from "../IForwardQuery";
import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./IProvider";

export class OpenCageDataProvider implements IProvider {
    private apiKey: string;
    private settings: { maxResults?: number, language?: string };

    constructor(apiKey: string, settings?: { maxResults?: number, language?: string }) {
        this.apiKey = apiKey;
        this.settings =  settings ?? { maxResults: 10 };
    }

    name: string = "opencage";
    requestId: number = 1;

    forward(query: IForwardQuery, callback: (results: IForwardResult[]) => void): void {
        const opencageQuery: opencage.GeocodeRequest = { q: query.string, key: this.apiKey };

        if (query.location) {
            opencageQuery.bounds = `${query.location.lon-2},${query.location.lat-1},${query.location.lon+2},${query.location.lat+1}`;
        }
        if (this.settings.language) {
            opencageQuery.language = this.settings.language;
        }
        this.requestId++;
        const requestId = this.requestId;

        if (query.string.length < 2) {
            callback([]);
            return;
        }

        opencage
            .geocode(opencageQuery)
            .then((data) => {
                if (this.requestId != requestId) {
                    console.log("another geocoding request was done, ignore this result"):
                    return;
                }
                const results = [];
                data.results.forEach(r => {

                    const result = {
                        description: r.formatted,
                        location: r.geometry,
                        provider: this.name,
                        score: 20,
                        type: r.components._type
                    };

                    // filter out irrelevant results.
                    if (result.type == "parking" ||
                        result.type == "fast_food") return;

                    // calculate our own confidence levels.
                    if (result.type == "city") {
                        result.score = 95;

                        // TODO: when far away, reduce score.
                    } else if (result.type == "village") {
                        result.score = 95;
                        result.description = r.components.village;

                        // TODO: when far away, reduce score.
                    } else if (result.type == "road") {
                        return;
                    } else if (result.type == "railway") {
                        result.score = 96;
                        result.description = r.components.railway;
                    }

                    // replace results with the same description if score is better.
                    const i = results.findIndex(x => x.description == result.description);
                    if (i >= 0) {
                        const existing = results[i];

                        if (existing.score < result.score) {
                            console.log("replaced");
                            console.log(existing);
                            console.log(result);
                            results[i] = result;
                        }
                    } else {
                        results.push(result);
                    }
                });
                
                callback(results);
            })
            .catch((error) => {
              console.error(error);
            });
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: string[]) => void): void {
        if (!l) return callback([ "Invalid location." ]);
        
        opencage
            .geocode({ q: `${l.lat},${l.lng}`, key: this.apiKey})
            .then((data) => {
                return callback([ data.results[0].formatted ]);
            })
            .catch((error) => {
              console.log('error', error.message);
            });
    }
}