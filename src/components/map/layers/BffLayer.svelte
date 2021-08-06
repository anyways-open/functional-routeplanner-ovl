<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";

    const { getMap } = getContext(key);
    const map: Map = getMap();

    onMount(async () => {
        map.on("load", async () => {
            const bffRoutesColor = "#cc0000";

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
                "https://static.anyways.eu/data/bff.geojson"
            );
            const json = await response.json();

            map.addSource("bff", {
                type: "geojson",
                data: json,
            });

            map.addLayer(
                {
                    id: "bff",
                    type: "line",
                    source: "bff",
                    minzoom: 11,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                        visibility: "none",
                    },
                    paint: {
                        "line-color": bffRoutesColor,
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            1,
                            12,
                            4,
                            16,
                            12,
                        ],
                        "line-opacity": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            0,
                            12,
                            0.3,
                            16,
                            1,
                        ],
                    },
                },
                lowestSymbol
            );
        });
    });
</script>
