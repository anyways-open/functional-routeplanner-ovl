<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../../map/map";
    import { BaseLayerControlManager } from "./BaseLayerControlManager";
    import type { BaseLayerControlOptions } from "./BaseLayerControlOptions";

    // exports.
    export let options: BaseLayerControlOptions;

    // get map from context.
    const { getMap } = getContext(key);
    const map: Map = getMap();

    // defined variables.
    let mapVisible: boolean = true;
    let manager: BaseLayerControlManager;
    let controlRoot: HTMLElement;
    
    onMount(async () => {
        console.log(controlRoot);
        manager = new BaseLayerControlManager(controlRoot, map, options);

        map.addControl(manager, "bottom-right");
    });

    function onActivateImagery(): void {
        manager.activateImagery();

        mapVisible = false;
    }

    function onActivateMap(): void {
        manager.deActivateImagery();

        mapVisible = true;
    }
</script>

<div class="mapboxgl-ctrl mapboxgl-ctrl-group" bind:this={controlRoot}>
    <nav class="base-layers">
        {#if mapVisible}
            <img src="{options.images.imagery}" alt="Luchtfotos" on:click={onActivateImagery}>
        {:else}
            <img src="{options.images.map}" alt="Kaart"  on:click={onActivateMap}>
        {/if}
    </nav>
</div>

<style>
    .base-layers {
        background: rgba(255, 255, 255, 0);
        display: none;
        z-index: 1;
        border-radius: 3px;
        width: 120px;
        height: 120px;
        padding: 2px;
    }

    .base-layers > img {
        width: 100%;
        height: 100%;
    }

    @media (min-width: 576px) {
        .base-layers {
            display: block;
        }
    }

</style>