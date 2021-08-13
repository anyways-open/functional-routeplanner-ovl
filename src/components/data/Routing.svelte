<script lang="ts">
    import Profiles from "./profiles/Profiles.svelte";
    import Locations from "./locations/Locations.svelte";
    import type { Location } from "./Location";
    import RouteList from "./routes/RouteList.svelte";
    import type { Route } from "./Route";
    import type { MapHook } from "./MapHook";
    import LocationSearchResultsTable from "./locations/search/LocationSearchResultsTable.svelte";
    import type { RoutesLayerHook } from "../map/layers/RoutesLayerHook";
    import type { LocationsLayerHook } from "../map/layers/locations/LocationsLayerHook";
    import type { UserLocationLayerHook } from "../map/layers/UserLocationLayerHook";
    import { RoutingManager } from "./RoutingManager";
    import type { LocationSearchResult } from "./locations/search/LocationSearchResult";
    import { ChainedProvider } from "../../apis/geocoder/Providers/ChainedProvider";
    import { CrabGeolocationProvider } from "../../apis/geocoder/Providers/CrabGeolocationProvider";
    import { OpenCageDataProvider } from "../../apis/geocoder/Providers/OpenCageDataProvider";
    import { Geocoder } from "../../apis/geocoder/Geocoder";
    import { RoutingApi } from "@anyways-open/routing-api";
    import { createEventDispatcher } from "svelte";

    // exports.
    export let mapHook: MapHook; // interface to communicate with the map.
    export let routeLayerHook: RoutesLayerHook; // interface to communicate with the routes layer.
    export let locationsLayerHook: LocationsLayerHook; // interface to communicate with the locations component.
    export let userLocationLayerHook: UserLocationLayerHook; // interface to communicate with the user location component.

    // events.
    const dispatch = createEventDispatcher<{ expand: boolean }>();
    function onRequestExpand(expand: boolean): void {
        dispatch("expand", expand);
    }

    // state.
    export let routes: Route[] = []; // the calculated routes.
    export let locations: Location[] = []; // the start, end and via locations.
    export let profile: string; // the profile.
    let searchLocation: number = -1; // the location being searched, the location the user is working with/has selected.
    let focusLocation: number = -1; // the location being shown.
    let view = RoutingManager.VIEW_START; // the default view is in routes view.
    let searchResults: LocationSearchResult[]; // the current search results.
    let userLocationRequested: boolean; // the user location is requested.
    let userLocationAvailable: boolean = true; // the user location is available.

    // TODO: move this to general settings files.
    // instantiate the routing api.
    const routingEndpoint = "https://staging.anyways.eu/routing-api2/";
    const routingApi = new RoutingApi(
        routingEndpoint,
        "Vc32GLKD1wjxyiloWhlcFReFor7aAAOz"
    );
    // setup geocoder.
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

    // start manager.
    let routingManager = new RoutingManager(
        view,
        profile,
        onStateUpdate,
        (query, callback) => {
            geocoder.geocode({ string: query }, callback);
        },
        (from, to, profile, alternatives, callback) => {
            routingApi.getRoute(
                {
                    locations: [from.location, to.location],
                    profile: profile,
                    alternatives: alternatives ? 2 : 1,
                },
                callback
            );
        }
    );

    // updates the state of this component.
    function onStateUpdate(state: any): void {
        const keys = Object.keys(state);

        keys.forEach((k) => {
            switch (k) {
                case "view":
                    view = state.view;
                    break;
                case "searchLocation":
                    searchLocation = state.searchLocation;
                    break;
                case "focusLocation":
                    focusLocation = state.focusLocation;
                    break;
                case "searchResults":
                    searchResults = state.searchResults;
                    break;
                case "locations":
                    locations = state.locations;
                    break;
                case "routes":
                    routes = state.routes;
                    break;
                case "userLocationRequested":
                    userLocationRequested = state.userLocationRequested;
                    break;
                case "userLocationAvailable":
                    userLocationAvailable = state.userLocationAvailable;
                    break;
            }
        });
    }

    let previousView = view;
    $: if (view !== previousView) {
        previousView = view;
        switch (view) {
            case RoutingManager.VIEW_START:
                onRequestExpand(false);
                break;
            case RoutingManager.VIEW_ROUTES:
            case RoutingManager.VIEW_SEARCH:
                onRequestExpand(true);
                break;
        }
    }

    $: if (focusLocation >= 0 && view == RoutingManager.VIEW_START) {
        if (typeof locations[focusLocation].location !== "undefined") {
            mapHook.flyTo(locations[focusLocation].location);
        }
    }


    // hook up user location management.
    $: if (typeof userLocationLayerHook !== "undefined") {
        userLocationLayerHook.on("geolocate", (e) => {
            routingManager.onUserLocation(e);
        });
        userLocationLayerHook.on("error", () => {
            routingManager.onUserLocationError();
        })
    }
    $: if (userLocationRequested && userLocationAvailable) {
        userLocationLayerHook.trigger();
    }

</script>

<div class="outer">
    <div class="row">
        <Locations
            bind:locations
            selected={searchLocation}
            on:focus={(e) => routingManager.onSearch(e.detail)}
            on:input={(e) => routingManager.onSearchInput(e.detail.value)}
            on:close={(e) => routingManager.onRemoveOrClear(e.detail)}
            on:add={() => routingManager.onAdd()}
            on:switch={() => routingManager.onSwitch()}
        />
    </div>
    <div
        class="row {view == RoutingManager.VIEW_SEARCH
            ? 'd-none d-sm-block'
            : ''}"
    >
        <Profiles
            {profile}
            on:profile={(p) => routingManager.onSelectProfile(p.detail)}
        />
    </div>

    {#if view === RoutingManager.VIEW_SEARCH}
        <div class="row">
            <LocationSearchResultsTable
                {searchResults}
                {userLocationAvailable}
                on:select={(e) => routingManager.onSelectResult(e.detail)}
                on:usecurrentlocation={() =>
                    routingManager.onSelectUserLocation()}
            />
        </div>
    {/if}

    {#if view === RoutingManager.VIEW_ROUTES}
        <div class="row">
            <RouteList {routes} />
        </div>
    {/if}
</div>

<style>
    .outer {
        background: #1da1f2;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        position: absolute;
        top: 0px;
        bottom: 0px;
        left: 0px;
        right: 0px;
        padding: 0.5rem;
    }

    .row {
        margin: 1rem !important;
    }

    @media (min-width: 576px) {
        .outer {
            background: #ffffff;
            box-shadow: 3px 3px 2px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            padding: unset;
            bottom: unset;
        }

        .row {
            margin: 0 !important;
        }
    }
</style>
