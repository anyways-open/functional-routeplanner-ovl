<script lang="ts">
    import type { Map } from "maplibre-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";
    import type { MapHook } from "../MapHook";

    const { getMap } = getContext(key);
    const mapAndHook = getMap();
    const map: Map = mapAndHook.map;
    const mapHook: MapHook = mapAndHook.hook;

    onMount(async () => {
        map.on("load", async () => {

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

            const response = await fetch("data/bff.geojson");
            const json = await response.json();

            map.addSource("bff", {
                type: "geojson",
                data: json,
            });

            const lffRoutesColor = "#ffff00";
            const filterLff = ["==", "FIETSROUTE", "LFF lokale functionele fietsroute"];
            const bffRoutesColor = "#00cc00";
            const filterBff = ["==", "FIETSROUTE", "BFF functionele fietsroute"];

            map.addLayer(
                {
                    id: "lff",
                    type: "line",
                    source: "bff",
                    minzoom: 11,
                    layout: Object.assign(
                        mapHook.defaultLayerState["lff"]?.layout ?? {},
                        {
                            "line-join": "round",
                            "line-cap": "round",
                        }
                    ),
                    paint: {
                        "line-color": lffRoutesColor,
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
                            0.7,
                            16,
                            1,
                        ],
                    },
                    filter: filterLff
                },
                lowestSymbol
            );

            map.addLayer(
                {
                    id: "bff",
                    type: "line",
                    source: "bff",
                    minzoom: 11,
                    layout: Object.assign(
                        mapHook.defaultLayerState["bff"]?.layout ?? {},
                        {
                            "line-join": "round",
                            "line-cap": "round",
                        }
                    ),
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
                            0.7,
                            16,
                            1,
                        ],
                    },
                    filter: filterBff
                },
                lowestSymbol
            );
        });
    });
</script>
