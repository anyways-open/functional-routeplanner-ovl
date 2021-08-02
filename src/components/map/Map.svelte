<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { Map } from "mapbox-gl";
    import "../../../node_modules/mapbox-gl/dist/mapbox-gl.css";
    import { key } from "./map";
    let map: Map;
    setContext(key, {
        getMap: () => {
            return map;
        }
    });
    onMount(async () => {
        map = new Map({
            container: "map",
            style: "https://api.maptiler.com/maps/basic/style.json?key=2Piy1GKXoXq0rHzzBVDA",
            center: [3.728, 51.0536],
            zoom: 10.75,
            hash: true,
        });
    });
</script>

<div id="map" class="h-100 map">
    {#if map}
    <slot></slot>
    {/if}
</div>

<style>
</style>