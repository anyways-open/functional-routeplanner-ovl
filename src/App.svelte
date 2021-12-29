<script lang="ts">
	import { afterUpdate, onMount } from "svelte";
	import Map from "./components/map/Map.svelte";
	import NetworksLayer from "./components/map/layers/NetworksLayer.svelte";
	import RoutesLayer from "./components/map/layers/RoutesLayer.svelte";
	import LocationsLayer from "./components/map/layers/locations/LocationsLayer.svelte";
	import type { Location } from "./components/data/Location";
	import type { MapHook } from "./components/map/MapHook";
	import Routing from "./components/data/Routing.svelte";
	import type { Route } from "./components/data/Route";
	import BaseLayerControl from "./components/map/controls/baselayer/BaseLayerControl.svelte";
	import type { BaseLayerControlOptions } from "./components/map/controls/baselayer/BaseLayerControlOptions";
	import ImageryLayer from "./components/map/layers/ImageryLayer.svelte";
	import LayerControl from "./components/map/controls/layers/LayerControl.svelte";
	import type { LayerConfig } from "./components/map/controls/layers/LayerConfig";
	import BffLayer from "./components/map/layers/BffLayer.svelte";
	import SchoolRoutes from "./components/map/layers/SchoolRoutes.svelte";
	import type { RoutesLayerHook } from "./components/map/layers/RoutesLayerHook";
	import type { LocationsLayerHook } from "./components/map/layers/locations/LocationsLayerHook";
	import GipodLayer from "./components/map/layers/GipodLayer.svelte";
	import type { UserLocationLayerHook } from "./components/map/layers/UserLocationLayerHook";
	import UserLocationLayer from "./components/map/layers/UserLocationLayer.svelte";
	import Settings from "./components/settings/Settings.svelte";
	import BicyclePoiLayer from "./components/map/layers/BicyclePoiLayer.svelte";
import type { AttributionControlOptions } from "./components/map/controls/attribution/AttributionControlOptions";
import AttributionControl from "./components/map/controls/attribution/AttributionControl.svelte";

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

	let settingsOpen: boolean = false;

	let mapHook: MapHook;
	let routingLayerHook: RoutesLayerHook;
	let locationsLayerHook: LocationsLayerHook;
	let userLocationLayerHook: UserLocationLayerHook;

	let attributionOptions: AttributionControlOptions = {
        customAttribution: "<a href=\"https://www.oost-vlaanderen.be/\">Prov. Oost-Vlaanderen</a> <a href=\"mailto:gis.polis@oost-vlaanderen.be\"><img src=\"assets/icons/email.svg\" alt=\"Email\" /></a>" +
			" | <a href=\"https://www.anyways.eu/\">ANYWAYS BV</a>"
	};
	let baseLayerOptions: BaseLayerControlOptions = {
		source: "aiv",
		images: {
			imagery: "assets/img/base-layers/sattelite.png",
			map: "assets/img/base-layers/map.png",
		},
	};
	let profiles: {
		id: string;
		description: string;
		icon: string;
		longDescription: string;
	}[] = [
		{
			id: "bicycle.commute",
			description: "Fietsen",
			icon: "assets/icons/bicycle.svg",
			longDescription:
				"De snelste route tussen 2 punten rekening houdend met veiligheid en comfort.",
		},
		{
			id: "bicycle.functional_network",
			description: "Fietsen langs netwerken",
			icon: "assets/icons/network.svg",
			longDescription:
				"De snelste route tussen 2 punten rekening houdend met veiligheid en comfort, maximaal langs de fietssnelwegen en lokale netwerken.",
		},
	];
	let layers: LayerConfig[] = [
		{
			id: "LN",
			name: "Lokaal Netwerk",
			layers: [
				"cycle-node-network",
				"cyclenodes-circles",
				"cyclenodes-circles-center",
				"cyclenodes-labels",
				"cycle-node-network-case",
				"cyclenetworks-brussels",
				"cyclenetworks-brussels-shields",
				"cyclenetworks-genk",
				"cyclenetworks-genk-shields"
			],
			logo: "assets/icons/network.svg",
			description: "Lokale netwerken van steden en gemeentes",
			visible: true,
			enabled: true,
		},
		{
			id: "FS",
			name: "Fietssnelwegen",
			layers: [
				"cycle-highways-case",
				"cycle-highways",
				"cycle-highways-labels-shields",
				"cycle-highways-case-proposed",
				"cycle-highways-proposed"
			],
			logo: "assets/icons/cyclehighways.svg",
			description: "De Vlaamse fietssnelwegen",
			visible: true,
			enabled: true,
		},
		{
			id: "SR",
			name: "Schoolroutes",
			layers: [
				"school-routes",
				"school-routes-unsafe",
				"school-routes-semi",
			],
			logo: "assets/icons/school.svg",
			description: "Gemeentelijke schoolroutes",
			visible: false,
			enabled: false,
		},
		{
			id: "BF",
			name: "Functioneel Fietsnetwerk",
			logo: "assets/icons/network.svg",
			layers: ["bff", "lff"],
			description: "Bovenlokaal functioneel fietsnetwerk",
			visible: false,
			enabled: true,
		},
		{
			id: "GP",
			name: "Wegenwerken",
			layers: ["gipod-con", "gipod-icon"],
			logo: "assets/icons/road-works.svg",
			description: "Wegenwerken",
			visible: false,
			enabled: true,
		},
	];

	function onExpand(expand: boolean) {
		if (expand) {
			heights = {
				data: "calc(75% + 6px)",
				map: "25%",
			};
		} else {
			heights = {
				data: "25%",
				map: "calc(75% + 6px)",
			};
		}
	}

	let profile: string = "bicycle.commute";
	let locations: Location[] = [
		{
			id: 0,
		},
		{
			id: 1,
		},
	];
	let routes: Route[] = [];

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

	afterUpdate(() => {
		mapHook.resize();
	});
</script>

<div id="full" class="full">
	<div id="map" class="map" style="height: {heights.map};">
		<Map bind:hook={mapHook}>
			<RoutesLayer {routes} bind:routeLayerHook={routingLayerHook} />
			<LocationsLayer {locations} bind:locationsLayerHook />
			<GipodLayer />
			<NetworksLayer />
			<ImageryLayer />
			<BffLayer />
			<SchoolRoutes />
			<UserLocationLayer bind:hook={userLocationLayerHook} />
			<BicyclePoiLayer />

			<AttributionControl options={attributionOptions} />
			<BaseLayerControl bind:options={baseLayerOptions} />
			<LayerControl bind:layers />

		</Map>
	</div>

	<div
		id="data"
		class="data {settingsOpen ? 'd-none' : ''}"
		style="height: {heights.data};"
		on:touchstart={onTouchStart}
		on:touchmove={onTouchMove}
		on:touchend={onTouchEnd}
	>
		<Routing
			bind:routeLayerHook={routingLayerHook}
			{profiles}
			bind:mapHook
			bind:routes
			bind:locations
			bind:profile
			bind:locationsLayerHook
			bind:userLocationLayerHook
			on:expand={(e) => onExpand(e.detail)}
		/>
	</div>

	<Settings {profiles} bind:profile bind:layers bind:open={settingsOpen} />
</div>

<style>
	.full {
		position: absolute;
		top: 0px;
		bottom: 0px;
		left: 0px;
		right: 0px;
		font: 16px/20px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
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
		max-height: calc(100% - 195px + 6px);
	}

	.data {
		position: absolute;
		bottom: 0px;
		left: 0px;
		right: 0px;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
		min-height: 195px;
		max-height: 75%;
	}

	@media (min-width: 576px) {
		.full {
			font-size: 12px;
		}

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
			width: 310px;
			min-height: 0px;
			max-height: 0px;
		}
	}
</style>
