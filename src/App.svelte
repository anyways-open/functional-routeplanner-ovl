<script lang="ts">
	import Map from "./components/map/Map.svelte";
	import type { LocationSearchResult } from "./components/data/locations/search/LocationSearchResult";
	import Profiles from "./components/data/Profiles.svelte";
	import { RoutingApi, Profile } from "@anyways-open/routing-api";
	import NetworksLayer from "./components/map/layers/NetworksLayer.svelte";
	import RoutesLayer from "./components/map/layers/RoutesLayer.svelte";
	import LocationsLayer from "./components/map/layers/LocationsLayer.svelte";
	import UserLocation from "./components/map/layers/UserLocation.svelte";
	import Locations from "./components/data/locations/Locations.svelte";
	import type { LocationData } from "./shared/data/LocationData";
	import LocationSearch from "./components/data/locations/search/LocationSearch.svelte";
	import RouteList from "./components/data/routes/RouteList.svelte";

	const routingEndpoint = "https://staging.anyways.eu/routing-api2/";
	const routingApi = new RoutingApi(
		routingEndpoint,
		"Vc32GLKD1wjxyiloWhlcFReFor7aAAOz"
	);

	const expandedHeight = 75;
	const heightCollapsed = 25;
	let height: number = heightCollapsed;

	const VIEW_START = "START";
	const VIEW_SEARCH = "SEARCH";
	const VIEW_ROUTES = "ROUTES";

	let viewState: { 
		view: "START" | "SEARCH" | "ROUTES",
		search?: {
			location: number,
			placeholder: string
		}
	} = {
		view: VIEW_START
	};

	let profile: string = "bicycle";
	let locations: LocationData[] = [
		{
			description: "Huidige Locatie",
			type: "USER_LOCATION",
			location: { lng: 3.7378, lat: 51.0569 },
		},
		{
			type: "END",
		},
	];

	function onSelect(e: CustomEvent<LocationSearchResult>): void {
		if (viewState.view != VIEW_SEARCH) return;
		if (typeof viewState.search === "undefined") return;

		locations[viewState.search.location] = {
			type: locations[viewState.search.location].type,
			description: e.detail.description,
			location: e.detail.location,
		};

		viewState = { view: VIEW_ROUTES };
	}

	$: switch (viewState.view) {
		case VIEW_SEARCH:
			height = expandedHeight;
			break;
		case VIEW_ROUTES:
			if (
				typeof profile !== "undefined" &&
				typeof locations[0].location !== "undefined" &&
				typeof locations[1].location !== "undefined"
			) {
				console.log("getroutes");
				getRoutes();
			}
			break;
	}

	let routes: { description: string; segments: any[] }[] = [];
	let routeSelected: number = 1;
	let routeSequence: number = 0;

	function onSwitch(): void {
		const t = locations[0];
		locations[0] = locations[1];
		locations[1] = t;

		routes = [];
	}

	function getRoutes() {
		if (typeof profile === "undefined" ||
			typeof locations[0].location === "undefined" ||
			typeof locations[1].location === "undefined") {
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

	function onDataClick(e: any): void {
		console.log(e);
		// if (height === expandedHeight) {
		// 	height = heightCollapsed;
		// } else {
		// 	height = expandedHeight;
		// }
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
			placeholder = "Naar"
		} else if (e.detail == 0) {
			placeholder = "Van";
		}

		viewState = { 
			view: VIEW_SEARCH,
			search: {
				location: e.detail,
				placeholder: placeholder
			}
		};
	}
</script>

<div class="full">
	<div class="map" style="height: calc({100 - height}% + 6px)">
		<Map>
			{#if viewState.view === VIEW_ROUTES}
				<RoutesLayer selected={routeSelected} {routes} />
			{/if}
			<LocationsLayer {locations} />
			<NetworksLayer />
			<UserLocation />
		</Map>
	</div>

	<div
		class="data container p-2"
		style="height: {height}%"
		on:dragstart={onDataClick}
	>
		{#if viewState.view === VIEW_START}
			<div class="row m-3">
				<Locations {locations} on:focus={onLocationFocus} />
			</div>
			<div class="row m-3">
				<Profiles bind:profile />
			</div>
		{/if}

		{#if viewState.view === VIEW_SEARCH}
			<div class="row m-3">
				<LocationSearch placeholder={viewState.search.placeholder} on:select={onSelect} />
			</div>
		{/if}

		{#if viewState.view === VIEW_ROUTES}
			<div class="row m-3">
				<Locations {locations} on:focus={onLocationFocus} />
			</div>
			<div class="row m-3">
				<Profiles bind:profile />
			</div>
			<div class="row m-3">
				<RouteList {routes} />
			</div>
		{/if}
	</div>
</div>

<style>
	.full {
		position: absolute;
		top: 0px;
		bottom: 0px;
		left: 0px;
		right: 0px;
	}

	.map {
		position: absolute;
		top: 0px;
		left: 0px;
		right: 0px;
	}

	.data {
		position: absolute;
		bottom: 0px;
		left: 0px;
		right: 0px;
		background: #1da1f2;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
	}
</style>
