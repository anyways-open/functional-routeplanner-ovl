<script lang="ts">
    import type { LocationSearchResult } from "./locations/search/LocationSearchResult";
    import Profiles from "./profiles/Profiles.svelte";
    import { RoutingApi, Profile } from "@anyways-open/routing-api";
    import Locations from "./locations/Locations.svelte";
    import type { Location } from "./Location";
    import LocationSearch from "./locations/search/LocationSearch.svelte";
    import RouteList from "./routes/RouteList.svelte";
    import type { Route } from "./Route";
    import type { MapHook } from "./MapHook";
    import { RoutingHook } from "./RoutingHook";

    // exports
    export let routingHook: RoutingHook = new RoutingHook();
    export let routes: Route[] = []; // the calculated routes.
    export let locations: Location[] = []; // the start, end and via locations.
    export let profile: string; // the profile.
    export let mapHook: MapHook; // interface to communicate with the map.

    // TODO: move this to general settings files.
    // instantiate the routing api.
    const routingEndpoint = "https://staging.anyways.eu/routing-api2/";
    const routingApi = new RoutingApi(
        routingEndpoint,
        "Vc32GLKD1wjxyiloWhlcFReFor7aAAOz"
    );

    const VIEW_START = "START";
    const VIEW_SEARCH = "SEARCH";
    const VIEW_ROUTES = "ROUTES";

    let viewState: {
        view: "START" | "SEARCH" | "ROUTES";
        search?: {
            location: number;
            placeholder: string;
        };
    } = {
        view: VIEW_START,
    };

    function onSelect(e: CustomEvent<LocationSearchResult>): void {
        if (viewState.view != VIEW_SEARCH) return;
        if (typeof viewState.search === "undefined") return;

        locations[viewState.search.location] = {
            description: e.detail.description,
            location: e.detail.location,
        };

        mapHook.flyTo(e.detail.location);

        viewState = { view: VIEW_ROUTES };
    }

    $: {
        switch (viewState.view) {
            case VIEW_SEARCH:
                if (typeof routingHook.onSearch !== "undefined") {
                    routingHook.onSearch();
                }
                break;
            case VIEW_ROUTES:
                if (
                    typeof profile !== "undefined" &&
                    typeof locations[0].location !== "undefined" &&
                    typeof locations[1].location !== "undefined"
                ) {
                    getRoutes();
                }
                break;
        }

        if (typeof mapHook !== "undefined") mapHook.resize();
    }

    let routeSelected: number = 1;
    let routeSequence: number = 0;

    function onSwitch(): void {
        const t = locations[0];
        locations[0] = locations[1];
        locations[1] = t;

        routes = [];
    }

    function getRoutes() {
        if (
            typeof profile === "undefined" ||
            typeof locations[0].location === "undefined" ||
            typeof locations[1].location === "undefined"
        ) {
            return;
        }

        var sequenceNumber = routeSequence;
        routingApi.getRoute(
            {
                locations: [locations[0].location, locations[1].location],
                profile: profile,
                alternatives: 2,
            },
            (e) => {
                if (routeSequence != sequenceNumber) {
                    console.warn(
                        `Routing was too slow, number at ${this.routeSequence}, but response has ${sequenceNumber}`
                    );
                    return;
                }

                if (e[profile + "0"]) {
                    const newRoutes: any[] = [
                        {
                            segments: [e[profile + "0"]],
                            description: "Aangeraden route",
                        },
                    ];

                    for (var a = 1; a <= 3; a++) {
                        var alternative = e[profile + `${a}`];
                        if (alternative) {
                            newRoutes.push({
                                segments: [alternative],
                                description: "Alternatieve route",
                            });
                        }
                    }

                    routes = newRoutes;
                } else {
                    routes = [
                        {
                            segments: [e],
                            description: "Aangeraden route",
                        },
                    ];
                }
            }
        );
    }

    if (
        typeof locations[0].location !== "undefined" &&
        typeof locations[1].location !== "undefined"
    ) {
        getRoutes();
    }

    function onLocationFocus(e: CustomEvent<number>): void {
        let placeholder: string = "Via";
        if (e.detail === locations.length - 1) {
            placeholder = "Naar";
        } else if (e.detail == 0) {
            placeholder = "Van";
        }

        viewState = {
            view: VIEW_SEARCH,
            search: {
                location: e.detail,
                placeholder: placeholder,
            },
        };
    }
</script>

<div class="outer">
    {#if viewState.view === VIEW_START}
        <div class="row">
            <Locations {locations} on:focus={onLocationFocus} />
        </div>
        <div class="row">
            <Profiles bind:profile />
        </div>
    {/if}

    {#if viewState.view === VIEW_SEARCH}
        <div class="row">
            <LocationSearch
                placeholder={viewState.search.placeholder}
                on:select={onSelect}
            />
        </div>
    {/if}

    {#if viewState.view === VIEW_ROUTES}
        <div class="row">
            <Locations
                {locations}
                on:switch={onSwitch}
                on:focus={onLocationFocus}
            />
        </div>
        <div class="row">
            <Profiles bind:profile />
        </div>
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
        padding: .5rem;
	}

    .row {
        margin: 1rem !important;
    }

	@media (min-width: 576px) { 
		.outer {
			background: #ffffff;
            box-shadow: 3px 3px 2px rgba(0,0,0,.1);
            border-radius: 4px;
            padding: unset;
		    bottom: unset;
		}

        .row {
            margin: 0 !important;
        }
	}
</style>