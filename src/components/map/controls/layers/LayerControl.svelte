<script lang="ts">
    import type { LayerConfig } from "./LayerConfig";
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../../map/map";
    import { LayerControlManager } from "./LayerControlManager";

    // exports.
    export let layers: LayerConfig[] = [];

    // get map from context.
    const { getMap } = getContext(key);
    const map: Map = getMap();

    // define variables.
    let manager: LayerControlManager;
    let controlRoot: HTMLElement;
    
    onMount(async () => {
        manager = new LayerControlManager(controlRoot, map, layers);

        map.addControl(manager, "bottom-right");
    });

    function onLayerToggle(i: number): void {
        layers[i].visible = !layers[i].visible;

        layers[i].layers.forEach(l => {
            const layer = map.getLayer(l);
            const visible = layers[i].visible;

            if (typeof layer == "undefined") {
                console.warn(`Layer with id: '${l}' not found.`);
                return;
            };

            if (visible) {
                map.setLayoutProperty(layer.id, "visibility", "visible");
            } else {
                map.setLayoutProperty(layer.id, "visibility", "none");
            }
        });

        layers = [...layers];
    }
</script>

<div class="mapboxgl-ctrl mapboxgl-ctrl-group" bind:this={controlRoot}>
<nav class="layer-control" >
    {#each layers as layer, i}
        {#if layer.enabled}
            <button class="btn {layer.visible ? 'active' : ''}" type="button" on:click={() => onLayerToggle(i)}>
                <img src={layer.logo} alt={layer.name} />
                <span>{layer.name}</span>
            </button>
        {/if}
    {/each}
</nav>
</div> 

<style>
    .layer-control {
        background: #0d8bd9;
        z-index: 1;
        border-radius: 3px;
        width: 120px;
        padding: 2px;
        display: none;
    }

    .layer-control .active {
        background: #1da1f2;
        border: none;
    }

    .layer-control img {
        height: 25px;
        width: 100%;
    }

    .btn {
        border: none;
        color: #fff;
        font-size: 13px;
        background: #0d8bd9;
        display: block;
        margin: 0;
        padding: 10px;
        text-decoration: none;
        text-align: center;
        height: 84px;
        width: 100%;
    }

    .btn:not(.active):hover {
        background-color: rgba(0,0,0,.05);
    }

    @media (min-width: 576px) {
        .layer-control {
            display: block;
        }
    }
</style>