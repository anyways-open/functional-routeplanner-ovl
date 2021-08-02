<script lang="ts">
	import Map from "./components/map/Map.svelte";
	import { OpenCageDataProvider } from "./apis/geocoder/Providers/OpenCageDataProvider";
	import { CrabGeolocationProvider } from "./apis/geocoder/Providers/CrabGeolocationProvider";
	import { ChainedProvider } from "./apis/geocoder/Providers/ChainedProvider";
	import * as turf from "@turf/turf";
	import type { SearchResult } from "./components/data/search/SearchResult";
	import { Geocoder } from "./apis/geocoder/Geocoder";
	import SearchResultsTable from "./components/data/search/SearchResultsTable.svelte";
	import RouteFromTo from "./components/data/routes/RouteFromTo.svelte";
	import Profiles from "./components/data/Profiles.svelte";
	import RouteList from "./components/data/routes/RouteList.svelte";
	import SearchField from "./components/data/search/SearchField.svelte";
	import { RoutingApi, Profile } from "@anyways-open/routing-api";
	import NetworksLayer from "./components/map/layers/NetworksLayer.svelte";
	import RoutesLayer from "./components/map/layers/RoutesLayer.svelte";
	import LocationsLayer from "./components/map/layers/LocationsLayer.svelte";

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

	let view: string = VIEW_START;

	let searchResults: SearchResult[] = [];

	let profile: string = "bicycle";
	let origin: {
		description: string;
		location: { lng: number; lat: number };
	} = {
		description: "Huidige Locatie",
		location: { lng: 3.7378, lat: 51.0569 },
	};
	let destination: {
		description: string;
		location: { lng: number; lat: number };
	};

	function onWhereToFocus(): void {
		height = expandedHeight;

		view = VIEW_SEARCH;
	}
	function onWhereToInput(value: CustomEvent<string>): void {
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

	function onSelect(e: CustomEvent<SearchResult>): void {
		destination = e.detail;

		view = VIEW_ROUTES;

		getRoutes();
	}

	$: if (typeof profile !== "undefined" &&
			typeof origin !== "undefined" &&
			typeof destination !== "undefined") {
		getRoutes();
	}

	let routes: {description: string, segments: any[] }[] = [];
	let routeSelected: number = 1;
	let routeSequence: number = 0;

	function onSwitch(): void {
		const t = origin;
		origin = destination;
		destination = t;

		routes = [];
	}

	function getRoutes() {
		if (
			typeof origin === "undefined" ||
			typeof destination === "undefined"
		) {
			return;
		}
		var sequenceNumber = routeSequence;

		routingApi.getRoute(
			{
				locations: [origin.location, destination.location],
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
							description: "Aangeraden route"
						},
					];

					for (var a = 1; a <= 3; a++) {
						var alternative = e[profile + `${a}`];
						if (alternative) {
							newRoutes.push({ segments: [alternative],
							description: "Alternatieve route" });
						}
					}

					routes = newRoutes;
				} else {
					routes = [
						{
							segments: [e],
							description: "Aangeraden route"
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

	if (typeof origin !== "undefined" && typeof destination !== "undefined") {
		getRoutes();
	}
</script>

<div class="full">
	<div class="map" style="height: calc({100 - height}% + 6px)">
		<Map>
			{#if routes.length}
			<RoutesLayer selected={routeSelected} {routes} />
			{/if}
			<LocationsLayer {origin} {destination}/>
			<NetworksLayer />
		</Map>
	</div>

	<div class="data container p-2" style="height: {height}%" on:dragstart="{onDataClick}">
		{#if view === VIEW_START || view === VIEW_SEARCH}
			<div class="row m-3">
				<SearchField
					value=""
					on:focus={onWhereToFocus}
					on:input={onWhereToInput}
				/>
			</div>
		{/if}

		{#if view === VIEW_ROUTES}
			<div class="row mx-3 mb-3">
				<RouteFromTo
					from={origin.description}
					to={destination.description}
					on:switch={onSwitch}
				/>
			</div>
		{/if}

		{#if view === VIEW_START || view === VIEW_ROUTES}
			<div class="row m-3">
				<Profiles bind:profile />
			</div>
		{/if}

		{#if view === VIEW_ROUTES}
			<div class="row m-3">
				<RouteList {routes} />
			</div>
		{/if}

		{#if view === VIEW_SEARCH}
			<SearchResultsTable {searchResults} on:select={onSelect} />
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
