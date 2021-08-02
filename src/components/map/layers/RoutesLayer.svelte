<script lang="ts">
    import type { GeoJSONSource, Map } from "mapbox-gl";
    import { getContext } from "svelte";
    import { key } from "../../map/map";

    export let routes: any[] = [];
    export let selected: number = 0;

    const { getMap } = getContext(key);
    const map: Map = getMap();

    $: if (typeof routes !== "undefined") {
        if (routes.length > 0) {
            if (typeof map !== "undefined") {
                let source: GeoJSONSource = map.getSource(
                    "route"
                ) as GeoJSONSource;
                if (typeof source === "undefined") {
                    // add source and layers.

                    // get lowest label and road.
                    const style = map.getStyle();
                    let lowestRoad = undefined;
                    let lowestLabel = undefined;
                    let lowestSymbol = undefined;
                    for (let l = 0; l < style.layers.length; l++) {
                        const layer = style.layers[l];

                        if (
                            layer &&
                            layer["source-layer"] === "transportation"
                        ) {
                            if (!lowestRoad) {
                                lowestRoad = layer.id;
                            }
                        }

                        if (
                            layer &&
                            layer["source-layer"] === "transportation_name"
                        ) {
                            if (!lowestLabel) {
                                lowestLabel = layer.id;
                            }
                        }

                        if (layer && layer.type == "symbol") {
                            if (!lowestSymbol) {
                                lowestSymbol = layer.id;
                            }
                        }
                    }

                    // add layers.
                    map.addSource("route", {
                        type: "geojson",
                        data: {
                            type: "FeatureCollection",
                            features: [],
                        },
                    });
                    const routeColorLight = "#1da1f2";
                    const routeColorDark = "#0d8bd9";
                    const routeColor = routeColorLight;
                    const routeColorCasing = "#000";
                    map.addLayer(
                        {
                            id: "route-case",
                            type: "line",
                            source: "route",
                            layout: {
                                "line-join": "round",
                                "line-cap": "round",
                            },
                            paint: {
                                "line-color": routeColorCasing,
                                "line-gap-width": 7,
                                "line-width": 2,
                            },
                            filter: ["all", ["==", "_route-index", 0]],
                        },
                        lowestLabel
                    );
                    map.addLayer(
                        {
                            id: "route-case-alternate",
                            type: "line",
                            source: "route",
                            layout: {
                                "line-join": "round",
                                "line-cap": "round",
                            },
                            paint: {
                                "line-color": "#000",
                                "line-gap-width": 7,
                                "line-width": 2,
                            },
                            filter: ["all", ["!=", "_route-index", 0]],
                        },
                        lowestLabel
                    );
                    map.addLayer(
                        {
                            id: "route-alternate",
                            type: "line",
                            source: "route",
                            layout: {
                                "line-join": "round",
                                "line-cap": "round",
                            },
                            paint: {
                                "line-color": "#94b8b8",
                                "line-width": 7,
                            },
                            filter: ["all", ["!=", "_route-index", 0]],
                        },
                        lowestLabel
                    );
                    map.addLayer(
                        {
                            id: "route",
                            type: "line",
                            source: "route",
                            layout: {
                                "line-join": "round",
                                "line-cap": "round",
                            },
                            paint: {
                                "line-color": routeColor,
                                "line-width": 7,
                            },
                            filter: ["all", ["==", "_route-index", 0]],
                        },
                        lowestLabel
                    );

                    map.addSource("route-snap", {
                        type: "geojson",
                        data: {
                            type: "FeatureCollection",
                            features: [],
                        },
                    });
                    map.addLayer(
                        {
                            id: "route-snap",
                            type: "circle",
                            source: "route-snap",
                            paint: {
                                "circle-color": "rgba(255, 255, 255, 1)",
                                "circle-stroke-color": routeColor,
                                "circle-stroke-width": 3,
                                "circle-radius": 5,
                            },
                        },
                        lowestLabel
                    );
                }
                source = map.getSource("route") as GeoJSONSource;

                const routesFeatures: GeoJSON.FeatureCollection<GeoJSON.Geometry> =
                    {
                        type: "FeatureCollection",
                        features: [],
                    };

                // add regular route.
                if (typeof routes !== "undefined") {
                    for (let i = 0; i < routes.length; i++) {
                        const routeSegments = routes[i].segments;
                        if (typeof routeSegments !== "undefined") {
                            for (let j = 0; j < routeSegments.length; j++) {
                                const routeSegment = routeSegments[j];
                                if (!routeSegment) continue;

                                const geojson =
                                    routeSegment as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

                                if (geojson && geojson.features) {
                                    geojson.features.forEach((f) => {
                                        if (f && f.properties) {
                                            f.properties[
                                                "_route-segment-index"
                                            ] = j;
                                            f.properties["_route-index"] = i;
                                        }
                                    });

                                    routesFeatures.features =
                                        routesFeatures.features.concat(
                                            geojson.features
                                        );
                                }
                            }
                        }
                    }

                    source.setData(routesFeatures);
                }
            }
        }
    }
</script>
