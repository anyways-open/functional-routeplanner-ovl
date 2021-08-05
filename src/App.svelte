<script lang="ts">
	import { onMount } from "svelte";
	import Map from "./components/map/Map.svelte";
	import NetworksLayer from "./components/map/layers/NetworksLayer.svelte";
	import RoutesLayer from "./components/map/layers/RoutesLayer.svelte";
	import LocationsLayer from "./components/map/layers/locations/LocationsLayer.svelte";
	import UserLocation from "./components/map/layers/UserLocation.svelte";
	import type { Location } from "./components/data/Location";
	import type { MapHook } from "./components/map/MapHook";
	import Routing from "./components/data/Routing.svelte";
	import type { Route } from "./components/data/Route";
	import type { RoutingHook } from "./components/data/RoutingHook";

	let dataElement: HTMLElement;
	let mapElement: HTMLElement;
	let heights: {
		data: string,
		map: string
	} = {
		data: "25%",
		map: "calc(75% + 6px)"
	};
    onMount(async () => {
		dataElement = document.getElementById("data");
		mapElement = document.getElementById("map");
	});

	let mapHook: MapHook;
	let routingHook: RoutingHook;

	$: if (typeof routingHook !== "undefined") {
		routingHook.onSearch = () => {
			heights = {
				data: "calc(75% + 6px)",
				map: "25%"
			}
		};
	}

	let profile: string = "bicycle";
	let locations: Location[] = [
		{
			description: "Huidige Locatie",
			isUserLocation: true,
			location: { lng: 3.7378, lat: 51.0569 },
		},
		{
			
		}
	];
	let routes: Route[] = [];
	let routeSelected: number = 0;

	let dragState: {
		height?: number,
		dragging?: {
			startTouch: number,
			startHeight: number
		}
	} = {};

	function onTouchStart(e: any) {
		dragState.height = dataElement.clientHeight;
		dragState.dragging = {
			startTouch: e.touches[0].clientY,
			startHeight: dragState.height
		};
	}

	function onTouchMove(e: any) {
		dragState.height = dragState.dragging.startHeight - (e.touches[0].clientY - dragState.dragging.startTouch);

		heights.data = dragState.height + "px";
		heights.map = "calc(100% - " + dragState.height + "px + 6px)";
		dataElement.style.height = heights.data;
		mapElement.style.height = heights.map;
		mapHook.resize();
	}

	function onTouchEnd(e: any) {

	}
</script>

<div id="full" class="full">
	<div id="map" class="map" style="height: {heights.map}; min-height: calc(25% + 6px); max-height: calc(75% + 6px);">
		<Map bind:hook={mapHook}>
			<RoutesLayer selected={routeSelected} {routes} />
			<LocationsLayer {locations} />
			<NetworksLayer />
			<UserLocation />
		</Map>
	</div>

	<div
		id="data"
		class="data container p-2"
		style="height: {heights.data}; min-height: 25%; max-height: 75%;"
		on:touchstart={onTouchStart}
		on:touchmove={onTouchMove}
		on:touchend={onTouchEnd}
	>
		<Routing bind:routingHook={routingHook} bind:mapHook={mapHook} bind:routes={routes} bind:locations={locations} bind:profile={profile} />
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
