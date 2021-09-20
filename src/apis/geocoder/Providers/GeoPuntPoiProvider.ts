import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { IProvider } from "./IProvider";
import type { IReverseResult } from "./IReverseResult";

export class GeoPuntPoiProvider implements IProvider {
    private apiRoot: string = "https://poi.api.geopunt.be/v1/core";

    constructor() {
        
    }

    name: string = "crab";

    forward(query: IForwardQuery, callback: (results: IForwardResult[]) => void): void {
        const xhr = new XMLHttpRequest(); 
        xhr.open("GET", `${this,this.apiRoot}?Theme=Onderwijs&Keyword=${query.string}`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.pois) {
                    const results = [];

                    //

                    response.pois.forEach(l => {
                        const location = l.location.points[0].Point.coordinates;

                        const description = `${l.labels[0].value}, ${l.location.address.street} ${l.location.address.streetnumber} ${l.location.address.postalcode} ${l.location.address.municipality}`;

                        // console.log(results);
                        // const i = results.indexOf((r: { description: string; }) => 
                        //     r.description === description);
                        // console.log(i);
                        // if (i !== -1) return;

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
        return callback([]);
    }
}