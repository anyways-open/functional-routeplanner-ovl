<script lang="ts">
    import { Map, Marker } from "mapbox-gl";
    import { getContext } from "svelte";
    import type { Location } from "./Location";
    import { key } from "../../../map/map";
    import * as svgs from "../../../svg";
    import { LocationsLayerHook } from "./LocationsLayerHook";

    export let locations: Location[] = [];
    export let locationsLayerHook: LocationsLayerHook =
        new LocationsLayerHook();
    locationsLayerHook.on = (name, handler) => {
        switch(name) {
            case "locationupdate":
                onLocationUpdate = handler;
                break;
        }
    };

    let onLocationUpdate: (e: any) => void;
    let markers: Marker[] = [];

    const { getMap } = getContext(key);
    const map: Map = getMap();

    $: if (typeof map !== "undefined") {
        locations.forEach((value, i) => {
            if (typeof value.location === "undefined") return;

            const markerId = i;

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
                offset: [0, -4],
            })
                .setLngLat(value.location)
                .addTo(map);
            markers[i] = marker;

            // hook drag event.
            marker.on("dragend", () => {
                if (typeof onLocationUpdate !== "undefined") {
                    onLocationUpdate({
                        index: markerId,
                        location: marker.getLngLat()
                    });
                }
            });
        });
    }
</script>
