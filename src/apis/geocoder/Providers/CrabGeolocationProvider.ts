import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { IProvider } from "./IProvider";
import type { IReverseResult } from "./IReverseResult";
import * as turf from "@turf/turf";

export class CrabGeolocationProvider implements IProvider {
    private apiRoot: string = "https://loc.geopunt.be/geolocation/";

    constructor() {
        
    }

    name: string = "crab";

    forward(query: IForwardQuery, callback: (results: IForwardResult[]) => void): void {
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `${this,this.apiRoot}/Location?q=${query.string}&c=5`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.LocationResult) {
                    const results = [];

                    response.LocationResult.forEach(l => {
                        let score = 50;
                        let type = "commune";
                        if (l.LocationType == "crab_straat") {
                            type = "street";
                            score = 70;
                        } else if (l.LocationType.startsWith("crab_huisnummer")) {
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
                    
                    callback(results);
                }
            }
            else {
                console.log("geocode failed: " + xhr.status);
            }
        };
        xhr.send();
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: IReverseResult[]) => void): void {
        if (!l) return callback([]);
        
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `${this,this.apiRoot}/Location?q=${l.lat},${l.lng}&c=1`);
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
                            distance: turf.distance([ l.lng, l.lat ], [ lr.Location.Lon_WGS84, lr.Location.Lat_WGS84 ]) * 1000
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