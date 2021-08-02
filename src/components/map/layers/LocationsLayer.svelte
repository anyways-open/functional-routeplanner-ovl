<script lang="ts">
    import { GeoJSONSource, Map, Marker } from "mapbox-gl";
    import { getContext } from "svelte";
    import { key } from "../../map/map";
    import * as svgs from "../../svg";

    export let origin: {
		description: string;
		location: { lng: number; lat: number };
	};
    export let destination: {
		description: string;
		location: { lng: number; lat: number };
	};

    let originMarker: Marker;
    let destinationMarker: Marker;

    const { getMap } = getContext(key);
    const map: Map = getMap();
    
    $: if (typeof map !== "undefined") {

        if (typeof origin !== "undefined") {
            const originElement = document.createElement("div");
            originElement.className = "marker-via";
            originElement.innerHTML = svgs.via;

            if (typeof originMarker !== "undefined") {
                originMarker.remove();
            }

            originMarker = new Marker(originElement, {
                draggable: true,
                offset: [0, -4]
            }).setLngLat(origin.location)
                .addTo(map);
        }
        
        if (typeof destination !== "undefined") {
            const destinationElement = document.createElement("div");
            destinationElement.className = "marker-destination";
            destinationElement.innerHTML = svgs.marker;

            if (typeof destinationMarker !== "undefined") {
                destinationMarker.remove();
            }

            destinationMarker = new Marker(destinationElement, {
                draggable: true,
                offset: [0, -20]
            }).setLngLat(destination.location)
                .addTo(map);
        }
    }
</script>