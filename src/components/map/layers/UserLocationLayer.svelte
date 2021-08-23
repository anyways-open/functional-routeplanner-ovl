<script lang="ts">
    import { Map, GeolocateControl } from "mapbox-gl";
    import { getContext, onMount } from "svelte";
    import { key } from "../../map/map";
    import { UserLocationLayerHook } from "./UserLocationLayerHook";

    const { getMap } = getContext(key);
    const map: Map = getMap().map;

    export let hook: UserLocationLayerHook = new UserLocationLayerHook();
    hook.on = (name, handler) => {
        switch (name) {
            case "geolocate":
                onGeolocation = handler;
                break;
            case "error":
                onError = handler;
                break;
        }
    };
    hook.trigger = () => {
        geolocationControl.trigger();
    };

    let onGeolocation: (e: any) => void;
    let onError: (e: any) => void;
    const geolocationControl = new GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true,
        },
        showAccuracyCircle: true,
        showUserLocation: true,
        trackUserLocation: false,
    });
    map.addControl(geolocationControl, "top-right");

    geolocationControl.on("geolocate", (pos) => {
        if (typeof onGeolocation !== "undefined") {
            onGeolocation({
                lng: pos.coords.longitude,
                lat: pos.coords.latitude,
            });
        }
    });
    geolocationControl.on("error", (e) => {
        if (typeof onError !== "undefined") {
            onError(e);
        }
    });
</script>
