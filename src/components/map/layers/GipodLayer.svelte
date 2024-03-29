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
                layout: Object.assign(
                        mapHook.defaultLayerState["gipod-con"]?.layout ?? {}, {
                }),
            }, lowestLabel);

            map.addLayer({
                id: "gipod-icon",
                type: "raster",
                source: "gipod-icon",
                minzoom: 15,
                paint: {},
                layout: Object.assign(
                        mapHook.defaultLayerState["gipod-icon"]?.layout ?? {}, {
                }),
            });
        });
    });
</script>
