<script lang="ts">
	import WhereTo from "./components/data/views/WhereTo.svelte";
	import Map from "./components/map/Map.svelte";
	import { OpenCageDataProvider } from "./apis/geocoder/Providers/OpenCageDataProvider";
	import { CrabGeolocationProvider } from "./apis/geocoder/Providers/CrabGeolocationProvider";
	import { ChainedProvider } from "./apis/geocoder/Providers/ChainedProvider";
	import * as turf from "@turf/turf";
	import type { SearchResult } from "./components/data/search/SearchResult";
	import { Geocoder } from "./apis/geocoder/Geocoder";
	import SearchResultRow from "./components/data/search/SearchResultRow.svelte";
	import SearchResultsTable from "./components/data/search/SearchResultsTable.svelte";

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

	const expandedHeight = 75;
	const heightCollapsed = 25;
	let height: number = heightCollapsed;

	let showSearchTable: boolean = false;

	let searchResults: SearchResult[] = [];

	let destination: string = "";

	function onWhereToFocus(): void {
		height = expandedHeight;
	}
	function onWhereToInput(value: CustomEvent<string>): void {

		showSearchTable = true;
		const searchString: string = value.detail;
		if (!searchString || searchString.length == 0) {
			searchResults = [];
			return;
        }

		// TODO: include current map center.
        geocoder.geocode({ string: searchString}, (results) => {
			searchResults = results;
        });
	}

	function onSelect(e: CustomEvent<SearchResult>): void {
		destination = e.detail.description;
	}
</script>

<div class="full">
	<div class="map" style="height: calc({100 - height}% + 6px)">
		<Map />
	</div>

	<div class="data" style="height: {height}%">
		<WhereTo value={destination} on:focus={onWhereToFocus} on:input={onWhereToInput} />

		{#if showSearchTable}
		<SearchResultsTable searchResults={searchResults} on:select={onSelect}/>
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
