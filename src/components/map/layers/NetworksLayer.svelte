<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";

    const { getMap } = getContext(key);
    const map: Map = getMap();
    
    onMount(async () => {
        map.on("load", () => {
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

                if (layer && layer["source-layer"] === "transportation_name") {
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

            map.addSource("cyclenetworks-tiles", {
                type: "vector",
                url: "https://api.anyways.eu/tiles/cyclenetworks/mvt.json"
            });

            map.addLayer({
                "id": "cycle-highways-case",
                "type": "line",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": "#fff",
                    "line-gap-width": [
                        "interpolate", ["linear"], ["zoom"],
                        10, 3,
                        12, 3,
                        16, 3
                    ],
                    "line-width": 2
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_highway",
                        "yes"
                    ],
                    [
                        "!=",
                        "state",
                        "proposed"
                    ]
                ]
            }, lowestLabel);

            const nodesColor = "#ccad00";
            const schoolRoutesColor = "#00cc00";
            const bffRoutesColor = "#cc0000";

            map.addLayer({
                "id": "cycle-node-network-case",
                "type": "line",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": "#fff",
                    "line-gap-width": [
                        "interpolate", ["linear"], ["zoom"],
                        10, 3,
                        12, 3,
                        16, 3
                    ],
                    "line-width": 2
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_network",
                        "srfn_gent"
                    ]
                ]
            }, lowestLabel);

            map.addLayer({
                "id": "cycle-highways",
                "type": "line",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": "#ff0000",
                    "line-width": [
                        "interpolate", ["linear"], ["zoom"],
                        10, 3,
                        12, 3,
                        16, 3
                    ]
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_highway",
                        "yes"
                    ],
                    [
                        "!=",
                        "state",
                        "proposed"
                    ]
                ]
            }, lowestLabel);

            map.addLayer({
                "id": "cycle-highways-labels",
                "type": "symbol",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                "minzoom": 12.5,
                "layout": {
                    "text-field": "{ref}",
                    "text-size": 15,
                    "symbol-placement": "line",
                    "symbol-spacing": 100
                },
                "paint": {
                    "text-color": "#ff0000",
                    "text-halo-color": "#FFFFFF",
                    "text-halo-width": 1.5,
                    "text-halo-blur": 1
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_highway",
                        "yes"
                    ],
                    [
                        "!=",
                        "state",
                        "proposed"
                    ]
                ]
            });

            map.addLayer({
                "id": "cycle-node-network",
                "type": "line",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": nodesColor,
                    "line-width": [
                        "interpolate", ["linear"], ["zoom"],
                        10, 3,
                        12, 3,
                        16, 3
                    ]
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_network",
                        "srfn_gent"
                    ]
                ]
            }, lowestLabel);

            map.addLayer({
                "id": "cyclenodes-circles",
                "type": "circle",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenodes",
                "minzoom": 12.5,
                "paint": {
                    "circle-stroke-width": 2,
                    "circle-stroke-color": nodesColor,
                    "circle-radius": 10,
                    "circle-color": "#000000",
                    "circle-opacity": 0
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_network",
                        "srfn_gent"
                    ]
                ]
            });

            map.addLayer({
                "id": "cyclenodes-circles-center",
                "type": "circle",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenodes",
                "minzoom": 12.5,
                "paint": {
                    "circle-radius": 10,
                    "circle-color": "#fff"
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_network",
                        "srfn_gent"
                    ]
                ]
            });

            map.addLayer({
                "id": "cyclenodes-labels",
                "type": "symbol",
                "source": "cyclenetworks-tiles",
                "source-layer": "cyclenodes",
                "minzoom": 12.5,
                "layout": {
                    "text-field": "{rcn_ref}",
                    "text-size": 13
                },
                "paint": {
                    "text-color": nodesColor,
                    "text-halo-color": nodesColor,
                    "text-halo-width": 0.5,
                    "text-halo-blur": 0
                },
                "filter": [
                    "all",
                    [
                        "==",
                        "cycle_network",
                        "srfn_gent"
                    ]
                ]
            });

        });
    });
</script>