import type { IChangedProviderSettings } from "./IChainedProviderSettings";
import type { IForwardQuery } from "../IForwardQuery";
import type { IForwardResult } from "../IForwardResult";
import type { IProvider } from "./IProvider";
import type { IReverseResult } from "./IReverseResult";

export class ChainedProvider implements IProvider {
    private providers: IChangedProviderSettings[] = [];
    private settings: {
        maxResults: number,
        maxReverseDistance: number
    };

    constructor(providers: IChangedProviderSettings[], settings?: { maxResults: number, maxReverseDistance: number }) {
        this.providers = providers;
        this.settings = settings ?? { maxResults: 10, maxReverseDistance: 50 };
    }

    name: string = this.providers.map(x => x.provider.name).join(",");

    async forward(query: IForwardQuery, options?: { signal?: AbortSignal }): Promise<IForwardResult[]> {
        return this.forwardWith(0, [], query, options);
    }

    private async forwardWith(p: number, previousResults: IForwardResult[],
        query: IForwardQuery, options?: { signal?: AbortSignal }): Promise<IForwardResult[]> {
        const provider = this.providers[p];

        if (options?.signal?.aborted) throw new Error("aborted");

        let chain = provider.chainForward;
        if (!chain) {
            chain = (previousResults: IForwardResult[], results: IForwardResult[]) => {
                if (results.length == 0) {
                    return { next: true, results: previousResults }
                }

                let chained = previousResults.concat(results);
                chained.sort((x, y) => {
                    if (x.score > y.score) return -1;
                    return 1;
                });
                return { next: true, results: chained };
            }
        }

        const results = await provider.provider.forward(query, options);
        const chained = chain(previousResults, results);
        if (chained.next && p < this.providers.length - 1) {
            return this.forwardWith(p + 1, chained.results, query, options);
        } else {
            let results = chained.results;
            if (results.length > this.settings.maxResults) {
                results = results.slice(0, this.settings.maxResults);
            }

            results.sort((x, y) => {
                if (x.score > y.score) return -1;
                return 1;
            });

            return results;
        }
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: IReverseResult[]) => void): void {
        this.reverseWith(0, [], l, callback);
    }

    private reverseWith(p: number, previousResults: IForwardResult[], l: { lng: number; lat: number; }, callback: (results: IReverseResult[]) => void): void {
        const provider = this.providers[p];

        let chain = provider.chainReverse;
        if (!chain) {
            chain = (l: { lng: number; lat: number; }, previousResults: IReverseResult[], results: IReverseResult[]) => {
                if (results && results.length > 0) {
                    return { next: false, results: results };
                } else {
                    // move to next provider.
                    if (p == this.providers.length) {
                        return { next: false, results: [] };
                    } else {
                        return { next: true, results: [] };
                    }
                }
            };
        }

        provider.provider.reverse(l, results => {
            const chained = chain(l, previousResults, results);
            if (chained.next && p < this.providers.length - 1) {
                this.reverseWith(p + 1, chained.results, l, callback);
            } else {
                let results = chained.results;
                if (results.length > this.settings.maxResults) {
                    results = results.slice(0, this.settings.maxResults);
                }

                results.sort((x, y) => {
                    if (x.distance > y.distance) return -1;
                    return 1;
                });

                for (let i = 0; i < results.length; i++) {
                    if (results[i].distance > this.settings.maxReverseDistance) {
                        results[i].description = `${results[i].location.lng},${results[i].location.lat}`;
                    }
                }
                callback(results);
            }
        });
    }
}