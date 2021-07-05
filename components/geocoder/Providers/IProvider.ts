import { IForwardQuery } from "../IForwardQuery";
import { IForwardResult } from "./IForwardResult";

export interface IProvider {
    /**
     * The name.
     */
    name: string,

    /**
     * Does a forward geocoding query.
     * @param query The search string.
     * @param callback The callback with the results.
     */
    forward(query: IForwardQuery, callback: (results: IForwardResult[]) => void): void;

    /**
     * Does a backard geocoding query.
     * @param l The location.
     * @param callback The callback with the results.
     */
    reverse(l: { lng: number; lat: number}, callback: (results: string[]) => void): void;
}