<script lang="ts">
    import { Map, Marker, Point, PointLike } from "mapbox-gl";
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
            if (location.isUserLocation) return;

            const element = document.createElement("div");
            if (i == locations.length - 1) {
                element.className = "marker-destination";
                element.innerHTML = svgs.marker;
                element.title = "Bestemming";
            } else {
                element.className = "marker-via";
                element.innerHTML = svgs.via;
                element.title = i == 0 ? "Vertrek" : "Via";
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
                if (typeof onLocationUpdate !== "undefined") {
                    // calculate box of marker.
                    const anchor = map.project(marker.getLngLat());
                    const offsets: Point = marker.getOffset();
                    const computedStyle = getComputedStyle(element);
                    const elementHeight = parseInt(computedStyle.height);
                    const elementWidth = parseInt(computedStyle.width);

                    const box = {
                        top: anchor.y + offsets.y - (elementHeight / 2),
                        left: anchor.x + offsets.x - (elementWidth / 2),
                        bottom: anchor.y + offsets.y + (elementHeight / 2),
                        right: anchor.x + offsets.x + (elementWidth / 2)
                    };

                    onLocationUpdate({
                        id: location.id,
                        location: marker.getLngLat(),
                        markerBox: box
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
