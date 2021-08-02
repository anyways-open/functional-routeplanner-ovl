<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";

    const { getMap } = getContext(key);
    const map: Map = getMap();
    
    onMount(async () => {
        map.on("load", () => {
            map.addSource("aiv", {
                "type": "raster",
                "tiles": ["https://tile.informatievlaanderen.be/ws/raadpleegdiensten/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=omwrgbmrvl&STYLE=&FORMAT=image/png&tileMatrixSet=GoogleMapsVL&tileMatrix={z}&tileRow={y}&tileCol={x}"],
                "tileSize": 256,
                "attribution": "AIV"
            });
        });
    });
</script>