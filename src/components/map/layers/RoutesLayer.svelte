<script lang="ts">
    import type { GeoJSONSource, Map } from "mapbox-gl";
    import { getContext } from "svelte";
    import { key } from "../../map/map";
    import * as turf from "@turf/turf";
    import type { NearestPointOnLine } from "@turf/nearest-point-on-line";
    import type { MapHook } from "../MapHook";
    import { RoutesLayerHook } from "./RoutesLayerHook";
    import type { Route } from "../../data/Route";

    export let routes: Route[] = []; // the routes.
    export let routeLayerHook: RoutesLayerHook = new RoutesLayerHook(); // interface to communicate with this component.

    const { getMap } = getContext(key);
    const mapAndHook = getMap();
    const map: Map = mapAndHook.map;
    const mapHook: MapHook = mapAndHook.hook;

    map.on("load", () => {
        mapLoaded = true;
    });

    let selected: number = 0; // the selected route.
    let snapPoint: NearestPointOnLine;
    let mapLoaded: boolean = false;
    //let latestBbox: any;

    // hook up events.
    let onClick: (e: any) => void;
    let onSelectRoute: (e: any) => void;
    routeLayerHook.on = (name, handler) => {
        switch (name) {
            case "click":
                onClick = handler;
                break;
            case "selectroute":
                onSelectRoute = handler;
                break;
        }
    };
    // routeLayerHook.fitRoute = (padding) => {
    //     if (typeof latestBbox === "undefined") return;

    //     console.log(latestBbox);

    //             map.fitBounds(
    //                 [
    //                     [latestBbox[0], latestBbox[1]],
    //                     [latestBbox[2], latestBbox[3]],
    //                 ],
    //                 {
    //                     padding: {
    //                         left: 20,
    //                         right: 20,
    //                         top: 20,
    //                         bottom: 50,
    //                     },
    //                 }
    //             );
    // };

    let clickHooked: boolean = false;
    $: if (typeof mapHook !== "undefined" && !clickHooked) {
        clickHooked = true;

        mapHook.on("click", (e) => onMapClick(e));
    }

    $: if (
        typeof routes !== "undefined" &&
        routes.length > 0 &&
        typeof routes[0] !== "undefined" &&
        selected >= 0 &&
        mapLoaded
    ) {
        if (typeof map !== "undefined") {
            let source: GeoJSONSource = map.getSource("route") as GeoJSONSource;
            if (typeof source === "undefined") {
                // add source and layers.

                // get lowest label and road.
                const style = map.getStyle();
                let lowestRoad = undefined;
                let lowestLabel = undefined;
                let lowestSymbol = undefined;
                for (let l = 0; l < style.layers.length; l++) {
                    const layer = style.layers[l];

                    if (layer && layer["source-layer"] === "transportation") {
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
                        filter: ["all", ["==", "_route-selected", true]],
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
                        filter: ["all", ["!=", "_route-selected", true]],
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
                        filter: ["all", ["!=", "_route-selected", true]],
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
                        filter: ["all", ["==", "_route-selected", true]],
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

            // show routes.
            const routeToSelect = routes.length == 1 ? 0 : selected;
            if (typeof routes !== "undefined") {
                for (let a = 0; a < routes.length; a++) {
                    const alternative = routes[a];
                    if (typeof alternative === "undefined") continue;

                    const routeSegments = alternative.segments;
                    if (typeof routeSegments !== "undefined") {
                        for (let s = 0; s < routeSegments.length; s++) {
                            const routeSegment = routeSegments[s];
                            if (!routeSegment) continue;

                            const geojson =
                                routeSegment as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

                            if (geojson && geojson.features) {
                                geojson.features.forEach((f) => {
                                    if (f && f.properties) {
                                        f.properties["_route-segment-index"] =
                                            s;
                                        f.properties["_route-index"] = a;
                                        f.properties["_route-selected"] =
                                            a == routeToSelect;
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

                if (routesFeatures.features.length > 0) {
                    const box = turf.bbox(routesFeatures);

                    const bounds = map.getBounds();

                    if (
                        !bounds.contains({
                            lng: box[0],
                            lat: box[1],
                        }) ||
                        !bounds.contains({
                            lng: box[0],
                            lat: box[3],
                        }) ||
                        !bounds.contains({
                            lng: box[2],
                            lat: box[1],
                        }) ||
                        !bounds.contains({
                            lng: box[2],
                            lat: box[3],
                        })
                    ) {
                        map.fitBounds(
                            [
                                [box[0], box[1]],
                                [box[2], box[3]],
                            ],
                            {
                                padding: {
                                    left: 20,
                                    right: 20,
                                    top: 20,
                                    bottom: 50,
                                },
                            }
                        );
                    }
                }
            }
        }
    }

    function onMapClick(e: any): void {
        if (typeof snapPoint !== "undefined") {
            return;
        }

        if (
            typeof map.getLayer("route") !== "undefined" &&
            typeof map.getLayer("route-alternate") !== "undefined"
        ) {
            const boxSize = 10;
            const features = map.queryRenderedFeatures(
                [
                    [e.point.x - boxSize, e.point.y - boxSize],
                    [e.point.x + boxSize, e.point.y + boxSize],
                ],
                {
                    layers: ["route-alternate", "route"],
                }
            );

            if (features.length > 0) {
                let route = -1;
                features.forEach((f) => {
                    if (f.geometry.type == "LineString") {
                        if (
                            f.properties &&
                            typeof f.properties["_route-index"] != "undefined"
                        ) {
                            route = Number(f.properties["_route-index"]);
                        }
                    }
                });
                if (route >= 0) {
                    if (selected != route) {
                        selected = route;
                        if (typeof onSelectRoute !== "undefined") {
                            onSelectRoute({
                                route: route,
                            });
                        }
                    }
                }
                return;
            }
        }

        if (typeof onClick !== "undefined") {
            onClick(e);
        }
    }
</script>
