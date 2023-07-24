<script lang="ts">
    import type { Map } from "maplibre-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../map";
    import type { MapHook } from "../MapHook";

    const { getMap } = getContext(key);
    const mapAndHook = getMap();
    const map: Map = mapAndHook.map;
    const mapHook: MapHook = mapAndHook.hook;

    onMount(async () => {
        map.on("load", () => {
            map.loadImage("assets/img/icons/bicycle-shop-32.png", (e, i) => {
                if (e) throw e;

                map.addImage("bicycle-shop", i);

                map.addLayer({
                    id: "bicycle-shops",
                    type: "symbol",
                    source: "openmaptiles",
                    "source-layer": "poi",
                    minzoom: 15,
                    paint: {
                        "text-color": "#1da1f2",
                        "text-halo-color": "#FFF",
                        "text-halo-width": 1,
                    },
                    layout: {
                        "icon-image": "bicycle-shop",
                        "icon-anchor": "bottom",
                        "icon-size": 0.75,
                        "text-field": [
                            "format",
                            ["get", "name"],
                            { "font-scale": 0.8 },
                        ],
                        "text-anchor": "top",
                        "symbol-sort-key": 10
                    },
                    filter: [
                        "all",
                        ["==", "$type", "Point"],
                        ["in", "class", "bicycle"],
                    ],
                });
            });

            map.loadImage("assets/img/icons/bicycle-parking-16.png", (e, i) => {
                if (e) throw e;

                map.addImage("bicycle-parking", i);

                map.addLayer({
                    id: "bicycle-parkings",
                    type: "symbol",
                    source: "openmaptiles",
                    "source-layer": "poi",
                    minzoom: 15,
                    layout: {
                        "icon-image": "bicycle-parking",
                        "icon-size": 1,
                        "symbol-sort-key": 10
                    },
                    filter: [
                        "all",
                        ["==", "$type", "Point"],
                        ["in", "class", "bicycle_parking"],
                    ],
                });
            });
        });
    });
</script>
