<script lang="ts">
    import {
        Map,
        LngLatLike,
        GeolocateControl,
        NavigationControl,
    } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";

    const { getMap } = getContext(key);
    const map: Map = getMap();

    const geolocationControl = new GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true,
        },
        showAccuracyCircle: true,
        showUserLocation: true,
        trackUserLocation: false,
    });
    map.addControl(geolocationControl, "top-right");
</script>
