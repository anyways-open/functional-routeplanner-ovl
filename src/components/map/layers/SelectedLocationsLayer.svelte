<script lang="ts">
    import {LngLatLike, Map, Marker} from "maplibre-gl";
    import {getContext} from "svelte";
    import type {RoutingManager} from "../../data/RoutingManager";
    import * as svgs from "../../svg";
    import {key} from "../../map/map";

    export let routingManager: RoutingManager;

    const { getMap } = getContext(key);
    const map: Map = getMap().map;

    routingManager.listenToState((s) => onStateUpdate(s));

    let marker: Marker = undefined;

    const onStateUpdate = (state: any) => {
        const keys = Object.keys(state);

        keys.forEach((k) => {
            switch (k) {
                case "location":
                    const location: LngLatLike = state.location;

                    if (typeof marker !== "undefined") {
                        marker.remove();
                    }
                    if (typeof location === "undefined") return;
                    
                    const element = document.createElement("div");
                    element.className = "marker-destination";
                    element.innerHTML = svgs.marker;
                    element.title = "Bestemming";

                    marker = new Marker(element, {
                        draggable: true,
                        offset: [0, -4],
                    })
                        .setLngLat(location)
                        .addTo(map);
                    break;
            }
        });
    };
</script>
