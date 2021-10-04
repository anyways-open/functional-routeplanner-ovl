<script lang="ts">
    import { onMount, setContext } from "svelte";
    import {
        FullscreenControl,
        LngLatLike,
        Map,
        NavigationControl,
    } from "mapbox-gl";
    import "../../../node_modules/mapbox-gl/dist/mapbox-gl.css";
    import { key } from "./map";
    import { MapHook } from "./MapHook";
    import { UrlHashHandler } from "../../shared/UrlHashHandler";

    // exports.
    export let hook: MapHook = new MapHook();

    // define variables.
    let map: Map;
    let urlHash = new UrlHashHandler("map");

    // get map context.
    setContext(key, {
        getMap: () => {
            return { map: map, hook: hook };
        },
    });
    onMount(async () => {
        let center: LngLatLike = [3.74475, 51.04774];
        let zoom: number = 10.51;
        const mapState = urlHash.getState();
        if (typeof mapState !== "undefined") {
            const parts = mapState.split("/");

            if (parts.length === 3) {
                center = [parseFloat(parts[1]), parseFloat(parts[2])];
                zoom = parseFloat(parts[0]);
            }
        }

        const styleResponse = await fetch(
            "https://api.maptiler.com/maps/152a1435-6dc1-441e-be13-3647c1ccb483/style.json?key=OZUCIh4RNx38vXF8gF4H"
            //"https://api.maptiler.com/maps/5ee3edf5-df11-4b36-88c9-f660f7afded9/style.json?key=OZUCIh4RNx38vXF8gF4H"
        );
        const styleJson = await styleResponse.json();

        styleJson.sources.openmaptiles.url =
            "https://api.anyways.eu/tiles/openmaptiles/mvt.json";
        styleJson.sources.openmaptiles.url =
            "https://staging.anyways.eu/api/vector-tiles/openmaptiles/mvt.json";

        map = new Map({
            container: "mapbox-gl-container",
            style: styleJson,
            center: center,
            zoom: zoom,
            hash: false,
            attributionControl: false,
        });

        const nav = new NavigationControl({
            visualizePitch: true,
        });
        map.addControl(nav, "top-right");

        map.addControl(new FullscreenControl());

        map.on("move", () => {
            const center = map.getCenter();
            urlHash.update(
                `${map.getZoom().toFixed(2)}/${center.lng.toFixed(
                    5
                )}/${center.lat.toFixed(5)}`
            );
        });

        map.on("load", () => {
            map.resize(); // on more resize, refresh on chrome broken.

            map.addLayer({
                id: "road_cycleway",
                type: "line",
                paint: {
                    "line-color": "#0000ff",
                    "line-width": {
                        base: 1.55,
                        stops: [
                            [4, 1],
                            [20, 6],
                        ],
                    },
                    "line-dasharray": [1, 1],
                },
                filter: [
                    "all",
                    ["==", "$type", "LineString"],
                    ["in", "subclass", "cycleway"],
                ],
                layout: {
                    "line-cap": "square",
                    "line-join": "bevel",
                },
                source: "openmaptiles",
                "source-layer": "transportation",
            },
                "bridge_major");
            map.addLayer(
                {
                    id: "bicycle-cycleway-lane",
                    type: "line",
                    source: "openmaptiles",
                    "source-layer": "transportation",
                    minzoom: 14,
                    paint: {
                        "line-color": "#0000ff",
                        "line-width": {
                            base: 1.55,
                            stops: [
                                [4, 1],
                                [20, 2],
                            ],
                        },
                        "line-gap-width": {
                            base: 1.4,
                            stops: [
                                [6, 0.5],
                                [20, 20],
                            ],
                        },
                        //"line-dasharray": [1, 1],
                    },
                    filter: ["all", ["==", "cycleway", "lane"], ["!=", "subclass", "cycleway"]],
                },
                "bridge_major"
            );
            map.addLayer(
                {
                    id: "bicycle-cyclestreet",
                    type: "line",
                    source: "openmaptiles",
                    "source-layer": "transportation",
                    minzoom: 14,
                    paint: {
                        "line-color": "#0000ff",
                        "line-opacity": 0.5,
                        "line-width": {
                            base: 1.55,
                            stops: [
                                [4, 3],
                                [20, 10],
                            ],
                        }
                        //"line-dasharray": [1, 1],
                    },
                    filter: ["all", ["==", "cyclestreet", "yes"]],
                },
                "bridge_major"
            );

            map.addLayer(
                {
                    id: "bicycle-cycleway-lane-right",
                    type: "line",
                    source: "openmaptiles",
                    "source-layer": "transportation",
                    minzoom: 14,
                    paint: {
                        "line-color": "#0000ff",
                        "line-width": {
                            base: 1.55,
                            stops: [
                                [4, 1],
                                [20, 2],
                            ],
                        },
                        "line-offset": {
                            base: 1.4,
                            stops: [
                                [6, 0.25],
                                [20, 10],
                            ],
                        },
                        //"line-dasharray": [1, 1],
                    },
                    filter: ["all", ["==", "cycleway:right", "lane"], ["!=", "subclass", "cycleway"]],
                },
                "bridge_major"
            );

            map.loadImage("assets/img/icons/double-arrow-8.png", (e, i) => {
                if (e) throw e;

                map.addImage("double-arrow", i);
                map.addLayer({
                    id: "bicycle-oneway-no",
                    type: "symbol",
                    source: "openmaptiles",
                    "source-layer": "transportation",
                    minzoom: 15,
                    paint: { "icon-opacity": 0.3 },
                    layout: {
                        "icon-image": "double-arrow",
                        "icon-rotate": 0,
                        "icon-padding": 10,
                        "icon-size": 0.75,
                        "symbol-spacing": 150,
                        "symbol-placement": "line",
                        "icon-rotation-alignment": "map",
                    },
                    filter: ["all", ["==", "oneway:bicycle", "no"]],
                });
            });

            map.loadImage("assets/img/icons/arrow-8.png", (e, i) => {
                if (e) throw e;
                map.addImage("arrow", i);

                map.addLayer({
                    id: "bicycle-oneway-yes",
                    type: "symbol",
                    source: "openmaptiles",
                    "source-layer": "transportation",
                    minzoom: 15,
                    paint: { "icon-opacity": 0.3 },
                    layout: {
                        "icon-image": "arrow",
                        "icon-rotate": 0,
                        "icon-padding": 10,
                        "icon-size": 0.75,
                        "symbol-spacing": 150,
                        "symbol-placement": "line",
                        "icon-rotation-alignment": "map",
                    },
                    filter: [
                        "all",
                        ["==", "oneway", 1],
                        ["!=", "oneway:bicycle", "no"],
                    ],
                });
            });
        });

        hook.resize = () => {
            map.resize();
        };
        hook.flyTo = (center) => {
            map.flyTo({
                center: [center.lng, center.lat],
                minZoom: 15,
            });
        };
        hook.on = (name, handler) => {
            map.on(name, (e) => handler(e));
        };
    });
</script>

<div id="mapbox-gl-container" class="h-100 map">
    {#if map}
        <slot />
    {/if}
</div>

<style>
</style>
