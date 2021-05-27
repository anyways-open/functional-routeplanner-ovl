import { call } from "when/node";

export class GeocodingControl {

    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    reverseGeocode(l: { lng: number; lat: number}, callback: (results: string[]) => void): void {
        if (!l) return callback([ "Invalid location." ]);
        
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `https://api.maptiler.com/geocoding/${l.lng},${l.lat}.json?key=${this.apiKey}`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                if (response.features && response.features.length) {
                    return callback([ response.features[0]["place_name"] ]);
                }
            }
            else {
                console.log("reverseGeocode failed: " + xhr.status);
            }
        };
        xhr.send();
    }

    geocode(searchString: string, callback: (results: { 
            description: string,
            location: { lng: number; lat: number}
        }[]) => void) {
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `https://api.maptiler.com/geocoding/${searchString}.json?key=${this.apiKey}`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                if (response.features && response.features.length) {
                    const results = [];
                    response.features.forEach(f => {
                        const p = f.geometry;
                        if (p.type != "Point") {
                            return;
                        }
                        results.push({
                            description: f.place_name,
                            location: {
                                lng: p.coordinates[0],
                                lat: p.coordinates[1]
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
}