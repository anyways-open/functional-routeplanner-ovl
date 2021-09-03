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

    let snapPoint: NearestPointOnLine;
    let mapLoaded: boolean = false;
    let locations: { lng: number, lat: number}[] = [];
    let selected: number = 0; // the selected alternative.

    // hook up events.
    let onClick: (e: any) => void;
    let onSelectRoute: (e: any) => void;
    let onDraggedRoute: (e: any) => void;
    routeLayerHook.on = (name, handler) => {
        switch (name) {
            case "click":
                onClick = handler;
                break;
            case "selectroute":
                onSelectRoute = handler;
                break;
            case "draggedroute":
                onDraggedRoute = handler;
                break;
        }
    };
    routeLayerHook.setSelectedAlternative = (i) => {
        selected = i;
    };

    let mapHookHooked: boolean = false;
    $: if (typeof mapHook !== "undefined" && !mapHookHooked) {
        mapHookHooked = true;

        // mapHook.on("click", (e) => onMapClick(e));
        mapHook.on("mousemove", (e) => onMapMouseMove(e));
        mapHook.on("mousedown", (e) => onMapMouseDown(e));
        mapHook.on("mouseup", (e) => onMapMouseUp(e));
    }

    $: if (typeof routes !== "undefined" && mapLoaded) {
        if (routes.length == 0) {
            let source: GeoJSONSource = map.getSource("route") as GeoJSONSource;
            if (typeof source !== "undefined") {
                source.setData({
                    type: "FeatureCollection",
                    features: [],
                });
            }
        } else if (typeof routes[0] !== "undefined" && selected >= 0) {
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
                locations = [];
                const routeToSelect = routes.length == 1 ? 0 : selected;
                if (typeof routes !== "undefined") {
                    let maxAlternatives = 1;
                    if (
                        typeof routes[0] !== "undefined" &&
                        typeof routes[0].segments !== "undefined"
                    ) {
                        maxAlternatives =
                            routes[0].segments.length > 1 ? 1 : routes.length;
                    }

                    for (let a = 0; a < maxAlternatives; a++) {
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
                                            f.properties[
                                                "_route-segment-index"
                                            ] = s;
                                            f.properties["_route-index"] = a;
                                            f.properties["_route-selected"] =
                                                a == routeToSelect;
                                        }

                                        if (f.geometry.type == "Point") {
                                            locations.push({
                                                lng: f.geometry.coordinates[0],
                                                lat: f.geometry.coordinates[1]
                                            });
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
    }

    // function onMapClick(e: any): void {
    //     if (typeof snapPoint !== "undefined") {
    //         return;
    //     }

    //     if (
    //         typeof map.getLayer("route") !== "undefined" &&
    //         typeof map.getLayer("route-alternate") !== "undefined"
    //     ) {
    //         const boxSize = 10;
    //         const features = map.queryRenderedFeatures(
    //             [
    //                 [e.point.x - boxSize, e.point.y - boxSize],
    //                 [e.point.x + boxSize, e.point.y + boxSize],
    //             ],
    //             {
    //                 layers: ["route-alternate", "route"],
    //             }
    //         );

    //         if (features.length > 0) {
    //             let route = -1;
    //             features.forEach((f) => {
    //                 if (f.geometry.type == "LineString") {
    //                     if (
    //                         f.properties &&
    //                         typeof f.properties["_route-index"] != "undefined"
    //                     ) {
    //                         route = Number(f.properties["_route-index"]);
    //                     }
    //                 }
    //             });
    //             if (route >= 0) {
    //                 if (selected != route) {
    //                     selected = route;
    //                     if (typeof onSelectRoute !== "undefined") {
    //                         onSelectRoute({
    //                             route: route,
    //                         });
    //                     }
    //                 }
    //             }
    //             return;
    //         }
    //     }

    //     if (typeof onClick !== "undefined") {
    //         onClick(e);
    //     }
    // }

    let dragging: boolean = false;

    function onMapMouseDown(e): void {
        if (typeof onDraggedRoute === "undefined") return;

        dragging = false;
        if (typeof snapPoint !== "undefined") {
            dragging = true;
        }
    }

    function onMapMouseUp(e): void {
        if (typeof onDraggedRoute === "undefined") return;

        if (dragging) {
            if (typeof snapPoint === "undefined") {
                throw Error("Snappoint not set but dragging.");
            }

            const routeIndex: number = snapPoint.properties["_route-segment-index"];
            onDraggedRoute({
                index: routeIndex + 1,
                location: e.lngLat
            });
            const snapSource: GeoJSONSource = map.getSource("route-snap") as GeoJSONSource;
            const empty: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                type: "FeatureCollection",
                features: []
            };
            snapSource.setData(empty);
            snapPoint = undefined;

            dragging = false;
            map.dragPan.enable();
        }
    }

    function onMapMouseMove(e): void {
        if (typeof onDraggedRoute === "undefined") return;

        const routeLayer = map.getLayer("route");
        if (typeof routeLayer === "undefined") return;

        const snapSource: GeoJSONSource = map.getSource(
            "route-snap"
        ) as GeoJSONSource;
        if (typeof snapSource === "undefined") return;

        if (!dragging) {
            const boxSize = 10;

            // check if dragging point is too close to an existing marker.
            // if so, don't show it.
            let tooCloseToMarker = false;
            for (let i = 0; i < locations.length; i++) {
                const location = locations[i];
                if (typeof location === "undefined") continue;

                const pl = map.project(location);
                if (
                    Math.abs(e.point.x - pl.x) < boxSize ||
                    Math.abs(e.point.x - pl.x) < boxSize
                ) {
                    tooCloseToMarker = true;
                }
            }

            // snap to line.
            let snapped: NearestPointOnLine;
            if (!tooCloseToMarker) {
                const features = map.queryRenderedFeatures(
                    [
                        [e.point.x - boxSize, e.point.y - boxSize],
                        [e.point.x + boxSize, e.point.y + boxSize],
                    ],
                    {
                        layers: ["route", "route-alternate"],
                    }
                );

                features.forEach((f) => {
                    if (f.geometry.type == "LineString") {
                        if (
                            f.properties &&
                            typeof f.properties["_route-segment-index"] !=
                                "undefined"
                        ) {
                            const s = turf.nearestPointOnLine(f.geometry, [
                                e.lngLat.lng,
                                e.lngLat.lat,
                            ]);
                            if (typeof s === "undefined") return;
                            if (s.properties.dist) {
                                if (typeof snapped === "undefined") {
                                    snapped = s;
                                    snapped.properties["_route-segment-index"] =
                                        f.properties["_route-segment-index"];
                                    snapped.properties[
                                            "_route-index"
                                        ] =
                                            f.properties[
                                                "_route-index"
                                            ];
                                } else {
                                    if (snapped.properties.dist) return;
                                    if (
                                        s.properties.dist <
                                        snapped.properties.dist
                                    ) {
                                        snapped = s;
                                        snapped.properties[
                                            "_route-segment-index"
                                        ] =
                                            f.properties[
                                                "_route-segment-index"
                                            ];
                                        snapped.properties[
                                            "_route-index"
                                        ] =
                                            f.properties[
                                                "_route-index"
                                            ];
                                    }
                                }
                            }
                        }
                    }
                });
            }

            if (typeof snapped === "undefined") {
                const empty: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: "FeatureCollection",
                    features: [],
                };
                snapSource.setData(empty);
                snapPoint = undefined;
                map.dragPan.enable();
                return;
            }
            snapSource.setData(snapped);
            snapPoint = snapped;

            const route = Number(snapped.properties["_route-index"]);
            if (route !== selected) {
                onSelectRoute(route);
            }

            map.dragPan.disable();
        } else {
            if (typeof snapPoint === "undefined") {
                return;
            }
            snapPoint.geometry = {
                type: "Point",
                coordinates: [e.lngLat.lng, e.lngLat.lat],
            };

            snapSource.setData(snapPoint);
        }
    }
</script>
