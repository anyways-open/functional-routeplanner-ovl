import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { IProvider } from "./IProvider";
import type { IReverseResult } from "./IReverseResult";
import * as turf from "@turf/turf";

export class CrabGeolocationProvider implements IProvider {
    private apiRoot: string = "https://geo.api.vlaanderen.be/geolocation/v4/";

    constructor() {

    }

    name: string = "crab";

    async forward(query: IForwardQuery, options?: { signal?: AbortSignal }): Promise<IForwardResult[]> {
        if (typeof query.string === "undefined") return;

        // REMARK; this is weird right, but CRAB returns communes when searching for kerk instead of streets.
        if (query.string.toLowerCase() === "kerk") {
            query.string = "kerkstraat";
        }

        const url = `${this, this.apiRoot}/Location?q=${query.string}&c=5`;
        const r = await fetch(url, {
            signal: options?.signal
        });

        if (!r.ok) {
            throw Error("Could not get matrix");
        }

        const response = await r.json();
        const results = [];

        if (response.LocationResult) {
            response.LocationResult.forEach(l => {
                let score = 50;
                let type = "commune";
                if (l.LocationType == "basisregisters_straat") {
                    type = "street";
                    score = 70;
                } else if (l.LocationType.startsWith("basisregisters_huisnummer")) {
                    type = "address";
                    score = 90;
                }

                results.push({
                    description: l.FormattedAddress,
                    location: {
                        lng: l.Location.Lon_WGS84,
                        lat: l.Location.Lat_WGS84
                    },
                    type: type,
                    score: score,
                    provider: this.name,
                    raw: l
                });
            });
        }

        return results;
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: IReverseResult[]) => void): void {
        if (!l) return callback([]);

        const xhr = new XMLHttpRequest();
        xhr.open("GET", `${this, this.apiRoot}/Location?q=${l.lat},${l.lng}&c=1`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                if (response.LocationResult) {
                    const results: IReverseResult[] = [];
                    response.LocationResult.forEach(lr => {
                        results.push({
                            description: lr.FormattedAddress,
                            location: {
                                lng: lr.Location.Lon_WGS84,
                                lat: lr.Location.Lat_WGS84
                            },
                            distance: turf.distance([l.lng, l.lat], [lr.Location.Lon_WGS84, lr.Location.Lat_WGS84]) * 1000
                        });
                    });

                    callback(results);
                }
            }
            else {
                console.log("reverseGeocode failed: " + xhr.status);
            }
        };
        xhr.send();
    }
}