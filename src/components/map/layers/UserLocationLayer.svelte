<script lang="ts">
    import {
        Map,
        GeolocateControl,
    } from "mapbox-gl";
    import { getContext } from "svelte";
    import { key } from "../../map/map";
    import { UserLocationLayerHook } from "./UserLocationLayerHook";

    const { getMap } = getContext(key);
    const map: Map = getMap();
    
    export let hook: UserLocationLayerHook = new UserLocationLayerHook();
    hook.on = (name, handler) => {
        onGeolocation = handler;
    };
    hook.trigger = () => {
        geolocationControl.trigger();
    };

    let onGeolocation: (e: any) => void;
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
                lat: pos.coords.latitude
            });
        }
    });
</script>
