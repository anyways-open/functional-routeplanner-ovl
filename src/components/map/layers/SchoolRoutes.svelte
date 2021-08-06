<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";

    const { getMap } = getContext(key);
    const map: Map = getMap();

    onMount(async () => {
        map.on("load", async () => {
            const schoolRoutesColor = "#00cc00";

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

            const response = await fetch(
                "https://static.anyways.eu/data/school-routes.geojson"
            );
            const json = await response.json();

            map.addSource("school-routes", {
                type: "geojson",
                data: json,
            });

            map.addLayer(
                {
                    id: "school-routes",
                    type: "line",
                    source: "school-routes",
                    minzoom: 1,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                        visibility: "none",
                    },
                    paint: {
                        "line-color": schoolRoutesColor,
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            6,
                            13,
                            6,
                            16,
                            12,
                        ],
                    },
                    filter: [
                        "any",
                        ["in", "SRK", 1, 4, 9],
                        ["in", "SRK_CODE", 1, 4, 9],
                        ["in", "ACCESS", "SAFE"],
                    ],
                },
                lowestSymbol
            );

            map.addLayer(
                {
                    id: "school-routes-unsafe",
                    type: "line",
                    source: "school-routes",
                    minzoom: 13.5,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                        visibility: "none",
                    },
                    paint: {
                        "line-color": "#FF0000",
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            6,
                            12,
                            10,
                            16,
                            12,
                        ],
                    },
                    filter: [
                        "any",
                        ["in", "SRK", 2],
                        ["in", "ACCESS", "OCCASIONALLY_UNSAFE"],
                    ],
                },
                lowestSymbol
            );

            map.addLayer(
                {
                    id: "school-routes-semi",
                    type: "line",
                    source: "school-routes",
                    minzoom: 14,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                        visibility: "none",
                    },
                    paint: {
                        "line-color": schoolRoutesColor,
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            6,
                            12,
                            10,
                            16,
                            12,
                        ],
                        "line-dasharray": [1, 1],
                    },
                    filter: ["in", "SRK", 3],
                },
                lowestSymbol
            );
        });
    });
</script>
