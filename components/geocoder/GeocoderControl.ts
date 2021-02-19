export class GeocodingControl {
    _id = 0;

    reverseGeocode(l: { lng: number; lat: number}, callback: ((results: string[]) => void)): void {
        if (!l) return callback([ "Invalid location." ]);

        this._id++;
        return callback([`Point ${this._id} `]);
    }
}