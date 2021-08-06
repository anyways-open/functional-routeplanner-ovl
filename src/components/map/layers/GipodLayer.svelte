<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../map";

    const { getMap } = getContext(key);
    const map: Map = getMap();

    onMount(async () => {
        map.on("load", () => {
            map.addSource("gipod-con", {
                type: "raster",
                tiles: [
                    "https://geoservices.informatievlaanderen.be/raadpleegdiensten/gipodpubliek/wms?SERVICE=WMS&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=default&VERSION=1.3.0&LAYERS=WoCon&WIDTH=1905&HEIGHT=303&CRS=EPSG:3857&BBOX={bbox-epsg-3857}",
                ],
                tileSize: 256,
            });

            map.addSource("gipod-icon", {
                type: "raster",
                tiles: [
                    "https://geoservices.informatievlaanderen.be/raadpleegdiensten/gipodpubliek/wms?SERVICE=WMS&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=default&VERSION=1.3.0&LAYERS=WoIcoon&WIDTH=1905&HEIGHT=303&CRS=EPSG:3857&BBOX={bbox-epsg-3857}",
                ],
                tileSize: 256,
            });

            map.addLayer({
                id: "gipod-con",
                type: "raster",
                source: "gipod-con",
                minzoom: 15,
                paint: {},
                layout: {
                    visibility: "none",
                },
            });

            map.addLayer({
                id: "gipod-icon",
                type: "raster",
                source: "gipod-icon",
                minzoom: 15,
                paint: {},
                layout: {
                    visibility: "none",
                },
            });
        });
    });
</script>
