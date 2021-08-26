<script lang="ts">
    import { onMount, setContext } from "svelte";
    import { LngLatLike, Map, NavigationControl } from "mapbox-gl";
    import "../../../node_modules/mapbox-gl/dist/mapbox-gl.css";
    import { key } from "./map";
    import { MapHook } from "./MapHook";
    import { UrlHashHandler } from "../../shared/UrlHashHandler";
    
    // exports.
    export let hook: MapHook = new MapHook();

    // define variables.
    let map: Map;
    let urlHash = new UrlHashHandler("map");

    // get map context.
    setContext(key, {
        getMap: () => {
            return { map: map, hook: hook};
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
                zoom = parseFloat(parts[0]);
            }
        }

        const styleResponse = await fetch(
                "https://api.maptiler.com/maps/152a1435-6dc1-441e-be13-3647c1ccb483/style.json?key=OZUCIh4RNx38vXF8gF4H"
            );
        const styleJson = await styleResponse.json();
        styleJson.sources.openmaptiles.url = "https://tiles.anyways.eu/data/v3.json";

        map = new Map({
            container: "mapbox-gl-container",
            style: styleJson,
            center: center,
            zoom: zoom,
            hash: false
        });

        const nav = new NavigationControl({
            visualizePitch: true
        });
        map.addControl(nav, "top-right");

        map.on("move", () => {
            const center = map.getCenter();
            urlHash.update(`${map.getZoom().toFixed(2)}/${center.lng.toFixed(5)}/${center.lat.toFixed(5)}`);
        });

        map.on("load", () => {
            map.resize(); // on more resize, refresh on chrome broken.
        });

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