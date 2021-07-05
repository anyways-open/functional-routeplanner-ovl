import { IChangedProviderSettings } from "./IChainedProviderSettings";
import { IForwardQuery } from "../IForwardQuery";
import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./IProvider";

export class ChainedProvider implements IProvider {
    private providers: IChangedProviderSettings[] = [];
    private settings: { maxResults: number };

    constructor(providers: IChangedProviderSettings[], settings?: { maxResults: number }) {
        this.providers = providers;
        this.settings =  settings ?? { maxResults: 10 };
    }

    name: string = this.providers.map(x => x.provider.name).join(",");

    forward(query: IForwardQuery, callback: (results: IForwardResult[]) => void): void {
        this.forwardWith(0, [], query, callback);
    }

    private forwardWith(p: number, previousResults: IForwardResult[],
        query: IForwardQuery, callback: (results: IForwardResult[]) => void): void {
        const provider = this.providers[p];

        let chain = provider.chainForward;
        if (!chain) {
            chain = (previousResults: IForwardResult[], results: IForwardResult[]) => {
                if (results.length == 0) {
                    return { next: true, results: [] }
                }

                let chained =  previousResults.concat(results);
                chained.sort((x, y) => {
                    if (x.score < y.score) return -1;
                    return 1;
                });
                return { next: false, results: chained};
            }
        }

        provider.provider.forward(query, results => {
            const chained = chain(previousResults, results);
            if (chained.next && p < this.providers.length - 1) {
                this.forwardWith(p + 1, chained.results, query, callback);
            } else {
                let results = chained.results;
                if (results.length > this.settings.maxResults) {
                    results = results.slice(0, this.settings.maxResults);
                }
                    
                results.sort(x => x.score);
                console.log(results);
                callback(results);
            }
        });
    }

    reverse(l: { lng: number; lat: number; }, callback: (results: string[]) => void): void {
        this.reverseWith(0, l, callback);
    }

    private reverseWith(p: number, l: { lng: number; lat: number; }, callback: (results: string[]) => void): void {
        const provider = this.providers[p];

        provider.provider.reverse(l, result => {
            if (result && result.length > 0) {
                callback(result);
            } else {
                // move to next provider.
                if (p == this.providers.length) {
                    callback([]);
                } else {
                    this.reverseWith(p + 1, l, callback);
                }
            }
        });
    }
}