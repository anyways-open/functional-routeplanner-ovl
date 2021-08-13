<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Geocoder } from "../../../../apis/geocoder/Geocoder";
    import { ChainedProvider } from "../../../../apis/geocoder/Providers/ChainedProvider";
    import { CrabGeolocationProvider } from "../../../../apis/geocoder/Providers/CrabGeolocationProvider";
    import { OpenCageDataProvider } from "../../../../apis/geocoder/Providers/OpenCageDataProvider";
    import * as turf from "@turf/turf";
    import LocationSearchField from "./LocationSearchField.svelte";
    import LocationSearchResultsTable from "./LocationSearchResultsTable.svelte";
    import type { LocationSearchResult } from "./LocationSearchResult";

    const maxReverseDistance = 100;
    const geocoderProvider = new ChainedProvider(
        [
            {
                provider: new CrabGeolocationProvider(),
                chainForward: (_, current) => {
                    const results = [];
                    let next = current.length == 0;
                    current.forEach((x) => {
                        if (x.type == "commune") {
                            next = true;
                            return;
                        }

                        results.push(x);
                    });

                    results.sort((x, y) => {
                        if (x.score < y.score) return -1;
                        return 1;
                    });

                    return { next: next, results: results };
                },
                chainReverse: (l, _, current) => {
                    let next = current.length == 0;
                    if (current.length > 0) {
                        const dist =
                            turf.distance(
                                [l.lng, l.lat],
                                [
                                    current[0].location.lng,
                                    current[0].location.lat,
                                ]
                            ) * 1000;

                        if (dist > maxReverseDistance) {
                            next = true;
                            current = [];
                        }
                    }
                    return { next: next, results: current };
                },
            },
            {
                provider: new OpenCageDataProvider(
                    "dcec93be31054bc5a260386c0d84be98",
                    {
                        language: "nl",
                    }
                ),
            },
        ],
        {
            maxResults: 5,
            maxReverseDistance: maxReverseDistance,
        }
    );
    const geocoder = new Geocoder(geocoderProvider, {
        forwardPreprocessor: (q) => {
            if (q && q.string && q.string.toLowerCase().startsWith("station")) {
                q = {
                    string: q.string.substring(7),
                    location: q.location,
                };
            }
            return q;
        },
    });

    export let placeholder: string = "";

    let searchResults: LocationSearchResult[] = [];

    function onSearchFieldInput(value: CustomEvent<string>): void {
        const searchString: string = value.detail;
        if (!searchString || searchString.length == 0) {
            searchResults = [];
            return;
        }

        // TODO: include current map center.
        geocoder.geocode({ string: searchString }, (results) => {
            searchResults = results;
        });
    }

    const dispatch = createEventDispatcher<{ select: LocationSearchResult }>();
    function onSelect(e: CustomEvent<LocationSearchResult>): void {
        dispatch("select", e.detail);
    }
</script>

<LocationSearchField {placeholder} on:input={onSearchFieldInput} />

<LocationSearchResultsTable {searchResults} on:select={onSelect} />

<style>
</style>
