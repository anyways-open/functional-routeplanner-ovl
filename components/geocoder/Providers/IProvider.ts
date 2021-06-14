export interface IProvider {

    /**
     * Does a forward geocoding query.
     * @param query The search string.
     * @param callback The callback with the results.
     */
    forward(query: string, callback: (results: { 
        description: string,
        location: { lng: number; lat: number}
    }[]) => void): void;

    /**
     * Does a backard geocoding query.
     * @param l The location.
     * @param callback The callback with the results.
     */
    reverse(l: { lng: number; lat: number}, callback: (results: string[]) => void): void;
}