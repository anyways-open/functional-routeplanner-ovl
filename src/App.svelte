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
	import BaseLayerControl from "./components/map/controls/baselayer/BaseLayerControl.svelte";
	import type { BaseLayerControlOptions } from "./components/map/controls/baselayer/BaseLayerControlOptions";
import ImageryLayer from "./components/map/layers/ImageryLayer.svelte";

	let dataElement: HTMLElement;
	let mapElement: HTMLElement;
	let heights: {
		data: string;
		map: string;
	} = {
		data: "25%",
		map: "calc(75% + 6px)",
	};
	onMount(async () => {
		dataElement = document.getElementById("data");
		mapElement = document.getElementById("map");
	});

	let mapHook: MapHook;
	let routingHook: RoutingHook;

	let baseLayerOptions: BaseLayerControlOptions = {
		source: "aiv",
		images: {
			imagery: "assets/img/base-layers/sattelite.png",
			map: "assets/img/base-layers/map.png",
		},
	};

	$: if (typeof routingHook !== "undefined") {
		routingHook.onSearch = () => {
			heights = {
				data: "calc(75% + 6px)",
				map: "25%",
			};
		};
	}

	let profile: string = "bicycle";
	let locations: Location[] = [
		{
			description: "Huidige Locatie",
			isUserLocation: true,
			location: { lng: 3.7378, lat: 51.0569 },
		},
		{},
	];
	let routes: Route[] = [];
	let routeSelected: number = 0;

	let dragState: {
		height?: number;
		dragging?: {
			startTouch: number;
			startHeight: number;
		};
	} = {};

	function onTouchStart(e: any) {
		dragState.height = dataElement.clientHeight;
		dragState.dragging = {
			startTouch: e.touches[0].clientY,
			startHeight: dragState.height,
		};
	}

	function onTouchMove(e: any) {
		dragState.height =
			dragState.dragging.startHeight -
			(e.touches[0].clientY - dragState.dragging.startTouch);

		heights.data = dragState.height + "px";
		heights.map = "calc(100% - " + dragState.height + "px + 6px)";
		dataElement.style.height = heights.data;
		mapElement.style.height = heights.map;
		mapHook.resize();
	}

	function onTouchEnd(e: any) {}
</script>

<div id="full" class="full">
	<div id="map" class="map" style="height: {heights.map};">
		<Map bind:hook={mapHook}>
			<RoutesLayer selected={routeSelected} {routes} />
			<LocationsLayer {locations} />
			<NetworksLayer />
			<ImageryLayer />
			<UserLocation />

			<BaseLayerControl bind:options={baseLayerOptions} />
		</Map>
	</div>

	<div
		id="data"
		class="data"
		style="height: {heights.data};"
		on:touchstart={onTouchStart}
		on:touchmove={onTouchMove}
		on:touchend={onTouchEnd}
	>
		<Routing
			bind:routingHook
			bind:mapHook
			bind:routes
			bind:locations
			bind:profile
		/>
	</div>
</div>

<!-- <div class="d-none d-sm-block">
	<div class="map-md">
		<Map bind:hook={mapHook}>
			<RoutesLayer selected={routeSelected} {routes} />
			<LocationsLayer {locations} />
			<NetworksLayer />
			<UserLocation />
		</Map>
	</div>
</div> -->
<style>
	.full {
		position: absolute;
		top: 0px;
		bottom: 0px;
		left: 0px;
		right: 0px;
		font: 12px/20px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
			Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif,
			Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;
		font-weight: 400;
		line-height: 1.5;
	}

	.map {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 100%;
		min-height: calc(25% + 6px);
		max-height: calc(75% + 6px);
	}

	.data {
		position: absolute;
		bottom: 0px;
		left: 0px;
		right: 0px;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
		min-height: 25%;
		max-height: 75%;
	}

	@media (min-width: 576px) {
		.map {
			position: absolute;
			top: 0px;
			left: 0px;
			right: 0px;
			min-height: 100%;
			max-height: 100%;
		}

		.data {
			position: absolute;
			left: 10px;
			top: 20px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			min-height: 300px;
			max-height: 300px;
			width: 350px;
		}
	}
</style>
