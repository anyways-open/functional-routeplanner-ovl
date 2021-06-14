import { IProvider } from "./IProvider";

export class CrabGeolocationProvider implements IProvider {
    private apiRoot: string = "https://loc.geopunt.be/geolocation/";

    constructor() {
        
    }

    forward(query: string, callback: (results: { description: string; location: { lng: number; lat: number; }; }[]) => void): void {
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `${this,this.apiRoot}/Location?q=${query}&c=5`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.LocationResult) {
                    const results = [];
                    response.LocationResult.forEach(l => {
                        results.push({
                            description: l.FormattedAddress,
                            location: {
                                lng: l.Location.Lon_WGS84,
                                lat: l.Location.Lat_WGS84
                            }
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