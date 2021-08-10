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
            case "locationclick":
                onLocationClick = handler;
                break;
        }
    };

    let onLocationUpdate: (e: any) => void;
    let onLocationClick: (e: any) => void;
    let markers: { marker: Marker, id: number }[] = [];

    const { getMap } = getContext(key);
    const map: Map = getMap();

    $: if (typeof map !== "undefined") {
        markers.forEach(m => {
            if (typeof m !== "undefined") {
                m.marker.remove();
            }
        });
        markers = [];

        locations.forEach((location, i) => {
            if (typeof location.location === "undefined") return;

            const element = document.createElement("div");
            if (i == locations.length - 1) {
                element.className = "marker-destination";
                element.innerHTML = svgs.marker;
            } else {
                element.className = "marker-via";
                element.innerHTML = svgs.via;
            }
            while (i >= markers.length) {
                markers.push(undefined);
            }

            const marker = new Marker(element, {
                draggable: true,
                offset: [0, -4],
            })
                .setLngLat(location.location)
                .addTo(map);
            markers[i] = { 
                marker: marker, 
                id: location.id 
            };

            // hook drag event.
            marker.on("dragend", (e) => {
                console.log(e);

                if (typeof onLocationUpdate !== "undefined") {
                    onLocationUpdate({
                        id: location.id,
                        location: marker.getLngLat()
                    });
                }
            });

            // add click event.
            element.addEventListener("click", (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();

                if (typeof onLocationClick !== "undefined") {
                    onLocationClick({
                        id: location.id,
                        location: marker.getLngLat()
                    });
                }

            }, true);
        });
    }
</script>
