import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { IReverseResult } from "./IReverseResult";

export interface IProvider {
    /**
     * The name.
     */
    name: string,

    /**
     * Does a forward geocoding query.
     * @param query The search string.
     * @param options Options with an optional abort signal.
     */
    forward(query: IForwardQuery, options?: { signal?: AbortSignal }): Promise<IForwardResult[]>;

    /**
     * Does a backard geocoding query.
     * @param l The location.
     * @param callback The callback with the results.
     */
    reverse(l: { lng: number; lat: number}, callback: (results: IReverseResult[]) => void): void;
}