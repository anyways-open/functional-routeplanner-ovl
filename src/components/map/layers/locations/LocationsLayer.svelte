<script lang="ts">
    import { Map, Marker } from "maplibre-gl";
    import { getContext } from "svelte";
    import type { Location } from "./Location";
    import { key } from "../../../map/map";
    import * as svgs from "../../../svg";
    import { LocationsLayerHook } from "./LocationsLayerHook";
    import { AppGlobal } from "../../../../AppGlobal";
    import type { RoutingManager } from "../../../data/RoutingManager";
    import { get } from "svelte/store";

    export let locations: Location[] = [];
    export let locationsLayerHook: LocationsLayerHook =
        new LocationsLayerHook();
    export let routingManager: RoutingManager;
    locationsLayerHook.on = (name, handler) => {
        switch (name) {
            case "locationupdate":
                onLocationUpdate = handler;
                break;
            case "locationclick":
                onLocationClick = handler;
                break;
        }
    };

    const onStateChanged = (state: any) => {
        const keys = Object.keys(state);

        keys.forEach((k) => {
            switch (k) {
                case "view":
                    view = state.view;
                    break;
            }
        });
    };
    routingManager.listenToState(onStateChanged);

    let onLocationUpdate: (e: any) => void;
    let onLocationClick: (e: any) => void;
    let markers: { marker: Marker; id: number }[] = [];
    let view = "";

    const { getMap } = getContext(key);
    const map: Map = getMap().map;

    $: if (typeof map !== "undefined") {
        markers.forEach((m) => {
            if (typeof m !== "undefined") {
                m.marker.remove();
            }
        });
        markers = [];

        if (view !== "LOCATION") {
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

                console.log("Do we have touch?", get(AppGlobal.assumeTouch))
                const draggable = !get(AppGlobal.assumeTouch)
                const marker = new Marker({
                    element,
                    draggable,
                    offset: [0, -4],
                })
                    .setLngLat(location.location)
                    .addTo(map);
                markers[i] = {
                    marker,
                    id: location.id,
                };

                // hook drag event.
                if (draggable) {
                    marker.on("dragend", (e) => {
                        if (typeof onLocationUpdate !== "undefined") {
                            // calculate box of marker.
                            const anchor = map.project(marker.getLngLat());
                            const offsets: {x:number, y:number} = <any> marker.getOffset();
                            const computedStyle = getComputedStyle(element);
                            const elementHeight = parseInt(
                                computedStyle.height
                            );
                            const elementWidth = parseInt(computedStyle.width);

                            const box = {
                                top: anchor.y + offsets.y - elementHeight / 2,
                                left: anchor.x + offsets.x - elementWidth / 2,
                                bottom:
                                    anchor.y + offsets.y + elementHeight / 2,
                                right: anchor.x + offsets.x + elementWidth / 2,
                            };

                            onLocationUpdate({
                                id: location.id,
                                location: marker.getLngLat(),
                                markerBox: box,
                            });
                        }
                    });

                    // add click event.
                    element.addEventListener(
                        "click",
                        (e) => {
                            e.stopPropagation();
                            e.stopImmediatePropagation();

                            if (typeof onLocationClick !== "undefined") {
                                onLocationClick({
                                    id: location.id,
                                    location: marker.getLngLat(),
                                });
                            }
                        },
                        true
                    );
                }
            });
        }
    }
</script>
