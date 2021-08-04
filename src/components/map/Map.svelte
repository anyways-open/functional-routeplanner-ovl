<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { Map } from "mapbox-gl";
    import "../../../node_modules/mapbox-gl/dist/mapbox-gl.css";
    import { key } from "./map";
    import { MapHook } from "./MapHook";

    export let hook: MapHook;

    let map: Map;
    setContext(key, {
        getMap: () => {
            return map;
        }
    });
    onMount(async () => {
        map = new Map({
            container: "mapbox-gl-container",
            style: "https://api.maptiler.com/maps/basic/style.json?key=2Piy1GKXoXq0rHzzBVDA",
            center: [3.728, 51.0536],
            zoom: 10.75,
            hash: true
        });

        hook = new MapHook();
        hook.resize = () => {
            map.resize();
        };
        hook.flyTo = (center) => {
            map.flyTo({
                center: [center.lat, center.lng],
                minZoom: 15
            });
        };
    });
</script>

<div id="mapbox-gl-container" class="h-100 map">
    {#if map}
    <slot></slot>
    {/if}
</div>

<style>
</style>