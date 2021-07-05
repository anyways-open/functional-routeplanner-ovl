import { IForwardQuery } from "../IForwardQuery";
import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./IProvider";

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

    reverse(l: { lng: number; lat: number; }, callback: (results: string[]) => void): void {
        if (!l) return callback([ "Invalid location." ]);
        
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `${this,this.apiRoot}/Location?q=${l.lat},${l.lng}&c=1`););
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                if (response.LocationResult) {
                    const results = [];
                    response.LocationResult.forEach(l => {
                        results.push(l.FormattedAddress);
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