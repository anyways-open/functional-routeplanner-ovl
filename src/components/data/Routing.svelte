<script lang="ts">
    import * as turf from "@turf/turf";
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
    import { createEventDispatcher, onMount } from "svelte";
    import { UrlHashHandler } from "../../shared/UrlHashHandler";
    import BackButton from "./BackButton.svelte";
    import { GeoPuntPoiProvider } from "../../apis/geocoder/Providers/GeoPuntPoiProvider";
    import { AppGlobal } from "../../AppGlobal";
    import MapSelectedLocation from "./locations/map-select/MapSelectedLocation.svelte";
    import { get } from "svelte/store";

    // exports.
    export let mapHook: MapHook; // interface to communicate with the map.
    export let routeLayerHook: RoutesLayerHook; // interface to communicate with the routes layer.
    export let locationsLayerHook: LocationsLayerHook; // interface to communicate with the locations component.
    export let userLocationLayerHook: UserLocationLayerHook; // interface to communicate with the user location component.
    export let profiles: {
        id: string;
        description: string;
        icon: string;
        longDescription: string;
    }[] = [];
    export let routingManager: RoutingManager;

    // events.
    const dispatch = createEventDispatcher<{ expand: boolean }>();
    function onRequestExpand(expand: boolean): void {
        dispatch("expand", expand);
    }

    // state.
    export let routes: Route[] = []; // the calculated routes.
    export let locations: Location[] = [
        {
            id: 0,
        },
        {
            id: 1,
        },
    ]; // the start, end and via locations.
    export let profile: string; // the profile.
    let searchLocation: number = -1; // the location being searched, the location the user is working with/has selected.
    let focusLocation: number = -1; // the location being shown.
    let view: "START" | "SEARCH" | "ROUTES" | "LOCATION" = RoutingManager.VIEW_START; // the default view is in routes view.
    let searchResults: LocationSearchResult[]; // the current search results.
    let userLocationRequested: boolean; // the user location is requested.
    let userLocationAvailable: boolean = true; // the user location is available.
    let selectedAlternative: number = 0;
    let location: {
        lng: number,
        lat: number,
        description?: string
    } = undefined;

    // TODO: move this to general settings files.
    // instantiate the routing api.
    //const routingEndpoint = "https://staging.anyways.eu/api/routing/";
    const routingEndpoint = "https://api.anyways.eu/routing/";
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
                    let next = true;
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
                provider: new GeoPuntPoiProvider(),
            },
            {
                provider: new OpenCageDataProvider(
                    "dcec93be31054bc5a260386c0d84be98",
                    {
                        language: "nl",
                        bounds: [2.63123, 50.60416, 5.91064, 51.50532],
                        countrycode: "be",
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
            if (
                q &&
                q.string &&
                q.string.toLowerCase().startsWith("station ")
            ) {
                q = {
                    string: q.string.substring(7),
                    location: q.location,
                };
            }
            if (
                q &&
                q.string &&
                q.string.toLowerCase().indexOf("puyenbroek") !== -1
            ) {
                q = {
                    string: q.string
                        .toLowerCase()
                        .replace("puyenbroek", "puyenbroeck"),
                    location: q.location,
                };
            }
            return q;
        },
    });

    let urlHash = new UrlHashHandler("route");
    let urlHashParsed = false;
    onMount(async () => {
        console.log(document.body.clientWidth);
        if (document.body.clientWidth < 576) {
			AppGlobal.isSmall.set(true);
        } else {
			AppGlobal.isSmall.set(false);
		}

        // state is as follows:
        // an array of locations comma seperate
        // with each location: name/lon/lat
        // - when not set but there name=empty
        // - when not geocoded name=point ex: point/4.1445/51.4471
        // - when geocoded name=escaped geocode string, ex: Sept%2042%2F4%2C%202275%20Wechelderzande/4.1445/51.4471
        // - when user location name=user, ex; user/4.1445/51.4471
        const routeState = urlHash.getState();
        if (typeof routeState !== "undefined") {
            // split.
            const locs = routeState.split(",");

            // get profile.
            profile = locs[0];

            // reset routes causing recalculate later.
            routes = [];

            // parse locations.
            let locationId = 0;
            locations.forEach((l) => {
                if (l.id + 1 > locationId) locationId = l.id + 1;
            });
            if (locs.length > 0) {
                for (let l = 1; l < locs.length; l++) {
                    const d = locs[l].split("/");
                    if (d.length != 3) continue;

                    const loc = {
                        lng: parseFloat(d[1]),
                        lat: parseFloat(d[2]),
                    };

                    const name = unescape(d[0]);

                    // overwrite locations.
                    locationId++;
                    const location: Location = {
                        id: locationId,
                        description: name,
                        location: loc,
                    };

                    if (l - 1 < locations.length) {
                        locations[l - 1] = location;
                    } else {
                        locations.push(location);
                    }
                }
            }
        } else {
            if (get(AppGlobal.isSmall)) {
                locations[0].isUserLocation = true;
            }
        }
        urlHashParsed = true;

        // start manager.
        routingManager = new RoutingManager(
            view,
            profile,
            locations,
            (query) => geocoder.geocode({ string: query }),
            (location, callback) => {
                geocoder.reverseGeocode(location, callback);
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
        routingManager.listenToState((s) => onStateUpdate(s));
    });
    $: if (
        typeof profile !== "undefined" &&
        typeof locations !== "undefined" &&
        urlHashParsed
    ) {
        let s = `${escape(profile)}`;
        let isEmpty = true;
        locations.forEach((l) => {
            if (s.length > 0) {
                s += ",";
            }

            if (typeof l.location === "undefined") {
                s += `empty`;
                return;
            }
            isEmpty = false;

            if (l.description) {
                s += `${escape(l.description)}/`;
            } else {
                s += `point/`;
            }

            const location = l.location;
            s += `${location.lng.toFixed(5)}/${location.lat.toFixed(5)}`;
        });

        if (isEmpty) {
            urlHash.update();
        } else {
            urlHash.update(s);
        }
    }

    // updates the state of this component.
    function onStateUpdate(state: any): void {
        const keys = Object.keys(state);

        keys.forEach((k) => {
            switch (k) {
                case "view":
                    view = state.view;
                    break;
                case "profile":
                    profile = state.profile;
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
                case "selectedAlternative":
                    selectedAlternative = state.selectedAlternative;
                    break;
            }
        });
    }

    // expand/collapse depending on view.
    let previousView:"START" | "SEARCH" | "ROUTES" | "LOCATION" = view;
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

    // fly to location if no route.
    $: if (
        focusLocation >= 0 &&
        view == RoutingManager.VIEW_START &&
        typeof mapHook !== "undefined"
    ) {
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
        });
    }
    $: if (userLocationRequested && userLocationAvailable) {
        userLocationLayerHook.trigger();
    }

    $: if (
        typeof routeLayerHook !== "undefined" &&
        selectedAlternative !== -1
    ) {
        routeLayerHook.setSelectedAlternative(selectedAlternative);
    }

    // hook up route layer interactions.
    $: if (typeof routeLayerHook !== "undefined") {
        routeLayerHook.on("selectroute", (e) => {
            routingManager.onSelectAlternative(e);
        });
        routeLayerHook.on("draggedroute", (e) => {
            routingManager.onInsertLocation(e.index, e.location);
        });
    }

    // hook up map interactions/events.
    let lastMarkerBox: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    let mapHookHooked: boolean = false;
    $: if (
        typeof mapHook !== "undefined" &&
        !mapHookHooked &&
        typeof mapHook.on !== "undefined"
    ) {
        mapHook.on("click", (e) => {
            // TODO: this is a workaround around mapbox gl triggering a click event after dragging a marker, there has to be a better way.
            if (typeof lastMarkerBox !== "undefined") {
                if (
                    lastMarkerBox.left - 1 <= e.point.x &&
                    lastMarkerBox.right + 1 >= e.point.x &&
                    lastMarkerBox.top - 1 <= e.point.y &&
                    lastMarkerBox.bottom + 1 >= e.point.y
                ) {
                    return;
                }
            }
            lastMarkerBox = undefined;

            // a location was added.
            // ignore this when there was not a mouse used, on touch devices we do things differently.
            if (get(AppGlobal.assumeTouch)) return;
            routingManager.onMapClick(e.lngLat);
        });
        mapHook.on("load", () => {
            routingManager.onMapLoaded();
        });
        mapHook.on("touchlong", (e) => {
            routingManager.onMapLongTouch(e.lngLat);
        });
        mapHookHooked = true;
    }
    let locationsLayerHookHooked: boolean = false;
    $: if (
        typeof locationsLayerHook !== "undefined" &&
        !locationsLayerHookHooked
    ) {
        locationsLayerHook.on("locationupdate", (e) => {
            lastMarkerBox = e.markerBox;

            routingManager.onLocationUpdateById(e.id, e.location);
        });

        locationsLayerHook.on("locationclick", (e) => {
            routingManager.onRemoveOrClearById(e.id);
        });

        locationsLayerHookHooked = true;
    }
</script>

<div class="outer">
    {#if view !== RoutingManager.VIEW_LOCATION}
        <div class="row">
            <Locations
                bind:locations
                selected={view == RoutingManager.VIEW_SEARCH
                    ? searchLocation
                    : -1}
                on:focus={(e) => routingManager.onSearch(e.detail)}
                on:input={(e) => routingManager.onSearchInput(e.detail.value)}
                on:close={(e) => routingManager.onRemoveOrClear(e.detail)}
                on:add={() => routingManager.onAdd()}
                on:switch={() => routingManager.onSwitch()} />
        </div>
        <div
            class="row {view == RoutingManager.VIEW_SEARCH
                ? 'd-none d-sm-block'
                : ''}">
            <Profiles
                {profiles}
                {profile}
                on:profile={(p) => routingManager.onSelectProfile(p.detail)} />
        </div>

        {#if view === RoutingManager.VIEW_SEARCH}
            <BackButton on:click={() => routingManager.onCancelSearch()} />
            <div class="row">
                <LocationSearchResultsTable
                    {searchResults}
                    {userLocationAvailable}
                    on:select={(e) => routingManager.onSelectResult(e.detail)}
                    on:usecurrentlocation={() =>
                        routingManager.onSelectUserLocation()} />
            </div>
        {/if}

        {#if view === RoutingManager.VIEW_ROUTES}
            <div class="row">
                <RouteList
                    {routes}
                    selected={selectedAlternative}
                    on:select={(e) =>
                        routingManager.onSelectAlternative(e.detail)} />
            </div>
        {/if}
    {:else}
        <BackButton on:click={() => routingManager.onCancelLocation()} />
        <div class="row">
            <MapSelectedLocation {routingManager} />
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
