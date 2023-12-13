<script lang="ts">
    import { onMount, setContext } from "svelte";
    import {
        Expression,
        FilterSpecification,
        FullscreenControl,
        LayerSpecification,
        LngLatLike,
        Map,
        MapTouchEvent,
        NavigationControl,
        Style,
        StyleSpecification,
    } from "maplibre-gl";
    import "../../../node_modules/maplibre-gl/dist/maplibre-gl.css";
    import { key } from "./map";
    import { MapHook } from "./MapHook";
    import { UrlHashHandler } from "../../shared/UrlHashHandler";
    import { LongPushInteractionHandler } from "./interactions/LongPushInteractionHandler";
    import { StyleTools } from "./StyleTools";
    import { MaplibreUtils } from "./MaplibreUtils";

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
            "https://api.maptiler.com/maps/152a1435-6dc1-441e-be13-3647c1ccb483/style.json?key=OZUCIh4RNx38vXF8gF4H",
            //"https://api.maptiler.com/maps/67ea3b5b-d4ac-48f3-ad92-6574c2dc9734/style.json?key=OZUCIh4RNx38vXF8gF4H"
            //"https://api.maptiler.com/maps/5ee3edf5-df11-4b36-88c9-f660f7afded9/style.json?key=OZUCIh4RNx38vXF8gF4H"
        );
        const styleJson = (await styleResponse.json()) as StyleSpecification;

        styleJson.sources.anyways = {
            url: "https://api.anyways.eu/publish/tiles/snapshot/d9258560-474e-48f7-b12a-e09326ae27b0/tiles/mvt.json",
            type: "vector",
        };

        // duplicate all layers, one for zoom levels above 10, others below.
        // zooms higher than 10 come from ANYWAYS, the rest maptiler.
        const newLayers: LayerSpecification[] = [];
        for (var l = 0; l < styleJson.layers.length; l++) {
            var layer = styleJson.layers[l];

            if (layer) {
                var sourceLayer = layer["source-layer"];

                if (sourceLayer === "transportation") {
                    if (layer.id.includes("rail")) {
                        newLayers.push(layer);
                        continue;
                    }
                    if (
                        typeof layer.maxzoom !== "undefined" &&
                        layer.maxzoom <= 10
                    ) {
                        // no need to add ANYWAYS alternative.
                        // zoom level too low.
                        newLayers.push(layer);
                        continue;
                    }

                    // use the ANYWAYS source for the cloned layer.
                    // and use a minzoom of 10.
                    var clonedLayer = structuredClone(
                        layer,
                    ) as LayerSpecification & { source: string };
                    clonedLayer.id = clonedLayer.id + "-anyways";
                    clonedLayer.minzoom = 10;
                    clonedLayer.source = "anyways";
                    newLayers.push(clonedLayer);

                    // modify the original with a max zoom of 10.
                    if (typeof layer.maxzoom === "undefined") {
                        layer.maxzoom = 10;
                    } else if (layer.maxzoom > 10) {
                        layer.maxzoom = 10;
                    }
                    newLayers.push(layer);
                } else {
                    newLayers.push(layer);
                }
            }
        }
        styleJson.layers = newLayers;

        StyleTools.removeLayers(styleJson, [
            "road_oneway",
            "road_oneway_opposite",
        ]);

        // Add cycleway and 'highway=path;bicycle=designtated' in bright blue
        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle_road_cycleway",
                type: "line",
                paint: {
                    "line-color": "#0000ff",
                    "line-opacity": 0.5,
                    "line-width": {
                        base: 1.55,
                        stops: [
                            [4, 1],
                            [20, 6],
                        ],
                    },
                },
                filter: [
                    "any",
                    [
                        "all",
                        ["==", "$type", "LineString"],
                        ["in", "highway", "cycleway"],
                        ["!in", "area", "yes"],
                    ],
                    [
                        "all",
                        ["==", "$type", "LineString"],
                        ["in", "bicycle", "designated", "yes"],
                        ["in", "class", "path"],
                        ["!in", "area", "yes"],
                    ],
                ],
                layout: {
                    "line-cap": "square",
                    "line-join": "bevel",
                },
                source: "anyways",
                "source-layer": "transportation",
            },
            "bridge_major",
        );
        // Add 'cycleway=track' on major roads in dotted, blue
        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-cycleway-lane",
                type: "line",
                source: "anyways",
                "source-layer": "transportation",
                minzoom: 14,
                paint: {
                    "line-color": "#0000ff",
                    "line-opacity": 0.5,
                    "line-width": {
                        base: 1.55,
                        stops: [
                            [4, 1],
                            [20, 6],
                        ],
                    },
                    "line-gap-width": {
                        base: 1.4,
                        stops: [
                            [6, 0.5],
                            [20, 20],
                        ],
                    },
                    "line-dasharray": [1, 1],
                },
                filter: [
                    "all",
                    ["in", "cycleway", "lane", "track"],
                    ["!=", "subclass", "cycleway"],
                ],
            },
            "bridge_major",
        );

        // Add cyclestreets in bright blue
        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-cyclestreet",
                type: "line",
                source: "anyways",
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
                    },
                    //"line-dasharray": [1, 1],
                },
                filter: ["all", ["==", "cyclestreet", "yes"]],
            },
            "bridge_major",
        );
        // Add dotted cycleways (with offset) if they are on the right
        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-cycleway-lane-right",
                type: "line",
                source: "anyways",
                "source-layer": "transportation",
                minzoom: 14,
                paint: {
                    "line-color": "#0000ff",
                    "line-opacity": 0.5,
                    "line-width": {
                        base: 1.55,
                        stops: [
                            [4, 1],
                            [20, 6],
                        ],
                    },
                    "line-offset": {
                        base: 1.4,
                        stops: [
                            [6, 0.25],
                            [20, 10],
                        ],
                    },
                    "line-dasharray": [1, 1],
                },
                filter: [
                    "all",
                    ["in", "cycleway:right", "lane", "track"],
                    ["!=", "subclass", "cycleway"],
                ],
            },
            "bridge_major",
        );

        const bicycleOneway: FilterSpecification = [
            "any",
            ["==", "anyways:oneway:bicycle", 1], // this tag overrrules all others.
            [
                "all", // if there is no anyways tag check for a regular bicycle oneway.
                ["!has", "anyways:oneway:bicycle"],
                ["==", "oneway:bicycle", 1],
            ],
            [
                "all", // if there is no anyways or a regular bicycle oneway check for a oneway
                ["!has", "anyways:oneway:bicycle"],
                ["!has", "oneway:bicycle"],
                ["==", "oneway", 1],
            ],
        ];

        const noOnewayBicycle: FilterSpecification = [
            "any",
            ["==", "anyways:oneway:bicycle", 0], // this tag overrrules all others, this means no oneway
            [
                "all", // if there is no anyways tag check for a regular bicycle oneway.
                ["!has", "anyways:oneway:bicycle"],
                ["==", "oneway:bicycle", 0],
            ],
        ];

        const onewayButNotBicycle: FilterSpecification = [
            "all",
            StyleTools.IsOnewayFilter(),
            noOnewayBicycle,
        ];
        const onewayReverseButNoBicycle: FilterSpecification = [
            "all",
            StyleTools.IsOnewayReverseFilter(),
            noOnewayBicycle,
        ];

        const bicycleOnewayReverse: FilterSpecification = [
            "any",
            ["==", "anyways:oneway:bicycle", -1], // this tag overrrules all others.
            [
                "all", // if there is no anyways tag check for a regular bicycle oneway.
                ["!has", "anyways:oneway:bicycle"],
                ["==", "oneway:bicycle", -1],
            ],
            [
                "all", // if there is no anyways or a regular bicycle oneway check for a oneway
                ["!has", "anyways:oneway:bicycle"],
                ["!has", "oneway:bicycle"],
                ["==", "oneway", -1],
            ],
        ];

        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-oneway",
                type: "symbol",
                source: "anyways",
                "source-layer": "transportation",
                minzoom: 15,
                paint: { "icon-opacity": 0.5 },
                layout: {
                    "icon-image": "single-arrow",
                    "icon-rotate": 0,
                    "icon-padding": 2,
                    "icon-size": 0.75,
                    "symbol-spacing": 75,
                    "symbol-placement": "line",
                    "icon-rotation-alignment": "map",
                },
                filter: bicycleOneway,
            },
            "road_major_motorway",
        );

        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-oneway-reverse",
                type: "symbol",
                source: "anyways",
                "source-layer": "transportation",
                minzoom: 15,
                paint: { "icon-opacity": 0.5 },
                layout: {
                    "icon-image": "single-arrow",
                    "icon-rotate": 180,
                    "icon-padding": 2,
                    "icon-size": 0.75,
                    "symbol-spacing": 75,
                    "symbol-placement": "line",
                    "icon-rotation-alignment": "map",
                },
                filter: bicycleOnewayReverse,
            },
            "road_major_motorway",
        );

        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-not-oneway",
                type: "symbol",
                source: "anyways",
                "source-layer": "transportation",
                minzoom: 15,
                paint: { "icon-opacity": 0.5 },
                layout: {
                    "icon-image": "double-arrow",
                    "icon-rotate": 0,
                    "icon-padding": 2,
                    "icon-size": 0.75,
                    "symbol-spacing": 75,
                    "symbol-placement": "line",
                    "icon-rotation-alignment": "map",
                },
                filter: onewayButNotBicycle,
            },
            "road_major_motorway",
        );

        StyleTools.addLayer(
            styleJson,
            {
                id: "bicycle-not-oneway-reverse",
                type: "symbol",
                source: "anyways",
                "source-layer": "transportation",
                minzoom: 15,
                paint: { "icon-opacity": 0.5 },
                layout: {
                    "icon-image": "double-arrow",
                    "icon-rotate": 180,
                    "icon-padding": 2,
                    "icon-size": 0.75,
                    "symbol-spacing": 75,
                    "symbol-placement": "line",
                    "icon-rotation-alignment": "map",
                },
                filter: onewayReverseButNoBicycle,
            },
            "road_major_motorway",
        );

        styleJson.layers.forEach((layer) => {
            if (layer.id !== "railway-transit") return;

            layer.filter = [
                "all",
                ["==", "class", "tram"],
                ["!=", "brunnel", "tunnel"],
            ];
        });

        const bicycleAccess = [
            "all",
            ["!in", "class", "motorway"],
            ["!in", "bicycle", "use_sidepath", "no"],
        ];

        map = new Map({
            container: "maplibre-gl-container",
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
                    5,
                )}/${center.lat.toFixed(5)}`,
            );
        });

        map.on("load", async () => {


            // TODO: move this to the cycling layer itself.
            // The 'cycling'-layer needs a few extra images 
            try {
                await MaplibreUtils.loadImage(map, "assets/img/icons/arrow-8.png", "single-arrow")
                await MaplibreUtils.loadImage(map, "assets/img/icons/double-arrow-8.png", "double-arrow")
            } catch (e) {
                console.error("Could not load a needed image:", e)
            }

            map.resize(); // on more resize, refresh on chrome broken.
        });

        let onLongPushHandler: (ev: MapTouchEvent) => void = undefined;
        const longPushInteraction = new LongPushInteractionHandler(map);
        longPushInteraction.enable((ev) => {
            if (typeof onLongPushHandler === "undefined") return;

            onLongPushHandler(ev);
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
            if (name === "touchlong") {
                onLongPushHandler = handler;
                return;
            }
            map.on(name, (e) => handler(e));
        };
    });
</script>

<div id="maplibre-gl-container" class="h-100 map">
    {#if map}
        <slot />
    {/if}
</div>

<style>
</style>
