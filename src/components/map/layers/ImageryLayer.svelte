<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";

    const { getMap } = getContext(key);
    const map: Map = getMap().map;

    onMount(async () => {
        map.on("load", () => {
            map.addSource("aiv", {
                type: "raster",
                tiles: [
                    "https://geo.api.vlaanderen.be/OFW/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ofw&STYLE=&FORMAT=image/png&tileMatrixSet=GoogleMapsVL&tileMatrix={z}&tileRow={y}&tileCol={x}"
                ],
                tileSize: 256,
                attribution: "AIV",
            });

            map.addLayer(
                {
                    id: "background-imagery",
                    type: "raster",
                    source: "aiv",
                    minzoom: 0,
                    maxzoom: 20,
                    layout: {
                        visibility: "none",
                    },
                },
                "background"
            );
        });
    });
</script>
