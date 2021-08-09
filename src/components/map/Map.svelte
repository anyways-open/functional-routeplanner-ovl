<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { LngLatLike, Map } from "mapbox-gl";
    import "../../../node_modules/mapbox-gl/dist/mapbox-gl.css";
    import { key } from "./map";
    import { MapHook } from "./MapHook";
    import { UrlHashHandler } from "../../shared/UrlHashHandler";
    
    // exports.
    export let hook: MapHook;

    // define variables.
    let map: Map;
    let urlHash = new UrlHashHandler("map");

    // get map context.
    setContext(key, {
        getMap: () => {
            return map;
        }
    });
    onMount(async () => {

        let center: LngLatLike = [3.74475, 51.04774];
        let zoom: number = 10.51;
        const mapState = urlHash.getState();
        if (typeof mapState !== "undefined") {
            const parts = mapState.split("/");

            if (parts.length === 3) {
                center = [parseFloat(parts[1]), parseFloat(parts[2])];
                zoom = parseInt(parts[0], 10);
            }
        }

        map = new Map({
            container: "mapbox-gl-container",
            style: "https://api.maptiler.com/maps/basic/style.json?key=2Piy1GKXoXq0rHzzBVDA",
            center: center,
            zoom: zoom,
            hash: false
        });

        map.on("move", () => {
            const center = map.getCenter();
            urlHash.update(`${map.getZoom().toFixed(2)}/${center.lng.toFixed(5)}/${center.lat.toFixed(5)}`);
        });

        hook = new MapHook();
        hook.resize = () => {
            map.resize();
        };
        hook.flyTo = (center) => {
            map.flyTo({
                center: [center.lng, center.lat],
                minZoom: 15
            });
        };
        hook.on = (name, handler) => {
            map.on(name, (e) => handler(e));
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