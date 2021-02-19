export class GeocodingControl {

    reverseGeocode(l: { lng: number; lat: number}, callback: ((results: string[]) => void)): void {
        if (!l) return callback([ "Invalid location." ]);
        
        const xhr = new XMLHttpRequest();
        const apiKey = "OZUCIh4RNx38vXF8gF4H";
        xhr.open("GET", `https://api.maptiler.com/geocoding/${l.lng},${l.lat}.json?key=${apiKey}`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);

                if (response.features && response.features.length) {
                    return callback([ response.features[0]["place_name"] ]);
                }
            }
            else {
                console.log("getProfiles failed: " + xhr.status);
            }
        };
        xhr.send();
    }
}