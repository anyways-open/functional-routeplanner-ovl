<script lang="ts">
    import { Map, Marker } from "mapbox-gl";
    import { getContext } from "svelte";
    import type { Location } from "./Location";  
    import { key } from "../../../map/map";
    import * as svgs from "../../../svg";

    export let locations: Location[] = [];
    let markers: Marker[] = [];

    const { getMap } = getContext(key);
    const map: Map = getMap();
    
    $: if (typeof map !== "undefined") {
        locations.forEach((value, i) => {
            if (typeof value.location === "undefined") return;

            const element = document.createElement("div");
            if (i == locations.length - 1) {
                element.className = "marker-destination";
                element.innerHTML = svgs.marker;
            } else {
                element.className = "marker-via";
                element.innerHTML = svgs.via;
            }

            if (i < markers.length && typeof markers[i] !== "undefined") {
                markers[i].remove();
            }
            while (i >= markers.length) {
                markers.push(undefined);
            }

            const marker = new Marker(element, {
                draggable: true,
                offset: [0, -4]
            }).setLngLat(value.location)
                .addTo(map);
            markers[i] = marker;
        });
    }
</script>