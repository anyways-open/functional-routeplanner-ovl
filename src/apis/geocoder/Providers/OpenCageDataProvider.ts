import * as opencage from "opencage-api-client";
import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { IProvider } from "./IProvider";
import type { IReverseResult } from "./IReverseResult";
import * as turf from "@turf/turf";

export class OpenCageDataProvider implements IProvider {
    private apiKey: string;
    private settings: { 
        maxResults?: number, 
        language?: string, 
        bounds?: [number,number,number,number],
        countrycode?: string
    };

    constructor(apiKey: string, settings?: { maxResults?: number, language?: string, bounds?: [number,number,number,number], countrycode?: string }) {
        this.apiKey = apiKey;
        this.settings =  settings ?? { maxResults: 10 };
    }

    name: string = "opencage";
    
    async forward(query: IForwardQuery, options?: { signal?: AbortSignal }): Promise<IForwardResult[]> {
        const opencageQuery: opencage.GeocodeRequest = { q: query.string, key: this.apiKey };

        if (query.location) {
            opencageQuery.proximity = `${query.location.lat},${query.location.lon}`;
        }
        if (typeof this.settings.bounds !== "undefined") {
            const bounds = this.settings.bounds;
            opencageQuery.bounds = `${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}`
        }
        if (typeof query.bounds !== "undefined") {
            const bounds = query.bounds;
            opencageQuery.bounds = `${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]}`
        }
        if (typeof this.settings.countrycode !== "undefined") {
            opencageQuery.countrycode = this.settings.countrycode;
        }
        if (this.settings.language) {
            opencageQuery.language = this.settings.language;
        }

        if (query.string.length < 2) {
            return [];
        }

        const data = await opencage.geocode(opencageQuery);
        if (options?.signal?.aborted) throw new Error("Request cancelled");

        const results = [];
        data.results.forEach(r => {
            const result = {
                description: r.formatted,
                location: r.geometry,
                provider: this.name,
                score: 20,
                type: r.components._type
            };

            // filter out addresses.
            if (typeof r.components.house_number !== undefined) {
                return;
            }

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
                    results[i] = result;
                }
            } else {
                results.push(result);
            }
        });

        return results;
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: IReverseResult[]) => void): void {
        if (!l) return callback([]);
        
        opencage
            .geocode({ q: `${l.lat},${l.lng}`, key: this.apiKey})
            .then((data) => {
                return callback([{
                    description: data.results[0].formatted,
                    location: data.results[0].geometry,
                    distance: turf.distance([ l.lng, l.lat ], [ data.results[0].geometry.lng, data.results[0].geometry.lat ]) * 1000
                 }]);
            })
            .catch((error) => {
              console.error(error);
            });
    }
}