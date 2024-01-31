import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { GeoPuntProviderSettings } from "./GeoPuntPoiProviderSettings";
import type { IProvider } from "./IProvider";
import type { IReverseResult } from "./IReverseResult";

export class GeoPuntPoiProvider implements IProvider {
    private apiRoot: string = "https://poi.api.geopunt.be/v1/core";
    private settings: GeoPuntProviderSettings;

    constructor(settings?: GeoPuntProviderSettings) {
        this.settings = settings ?? {
            maxCount: 2
        };

        console.log(this.settings);
    }

    name: string = "crab";

    async forward(query: IForwardQuery, options?: { signal?: AbortSignal }): Promise<IForwardResult[]> {
        const url = `${this, this.apiRoot}?Theme=Onderwijs&Keyword=${query.string}`);
        const r = await fetch(url, {
            signal: options?.signal
        });

        const response = await r.json();
        const results = [];

        if (response.pois) {
            response.pois.forEach(l => {
                if (results.length >= this.settings.maxCount) return;

                const location = l.location.points[0].Point.coordinates;
                const description = `${l.labels[0].value}, ${l.location.address.street} ${l.location.address.streetnumber} ${l.location.address.postalcode} ${l.location.address.municipality}`;

                results.push({
                    description: description,
                    location: {
                        lng: location[0],
                        lat: location[1]
                    },
                    type: "school",
                    score: 80,
                    provider: this.name,
                    raw: l
                });
            });
        }

        return results;
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: IReverseResult[]) => void): void {
        return callback([]);
    }
}