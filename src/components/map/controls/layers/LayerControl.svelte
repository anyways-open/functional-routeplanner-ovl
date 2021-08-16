<script lang="ts">
    import type { LayerConfig } from "./LayerConfig";
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../../map/map";
    import { LayerControlManager } from "./LayerControlManager";
    import { UrlHashHandler } from "../../../../shared/UrlHashHandler";
    import type { MapHook } from "../../MapHook";

    // exports.
    export let layers: LayerConfig[] = [];
    let initialConfig: LayerConfig[] = [];
    layers.forEach((l) => {
        initialConfig.push(Object.assign({}, l));
    });

    // get map from context.
    const { getMap } = getContext(key);
    const mapAndHook = getMap();
    const map: Map = mapAndHook.map;
    const mapHook: MapHook = mapAndHook.hook;
    let urlHashParsed = false;
    let urlHash = new UrlHashHandler("layers");

    // define variables.
    let manager: LayerControlManager;
    let controlRoot: HTMLElement;

    // update url layers hash.
    $: if (typeof layers !== "undefined" && urlHashParsed) {
        let layerSettings: string[] = [];
        layers.forEach((l, i) => {
            if (l.enabled != initialConfig[i].enabled) {
                if (l.enabled) {
                    if (l.visible) {
                        layerSettings.push(`${l.id}1`);
                    } else {
                        layerSettings.push(`${l.id}2`);
                    }
                } else {
                    layerSettings.push(`${l.id}0`);
                }
                return;
            }
            if (l.enabled && l.visible != initialConfig[i].visible) {
                if (l.visible) {
                    layerSettings.push(`${l.id}1`);
                } else {
                    layerSettings.push(`${l.id}2`);
                }
            }
        });
        if (layerSettings.length == 0) {
            urlHash.update(undefined);
        } else {
            urlHash.update(layerSettings.join("|"));
        }
    }

    // show/hide layers.
    $: if (typeof layers !== "undefined" && urlHashParsed) {
        for (let i = 0; i < layers.length; i++) {
            layers[i].layers.forEach((l) => {
                const visible = layers[i].visible;

                // set default layer state.
                mapHook.defaultLayerState[l] = {
                    layout: { visibility: visible ? "visible" : "none" },
                };

                // if layer was loaded, set default.
                const layer = map.getLayer(l);
                if (typeof layer == "undefined") {
                    return;
                }
                if (visible) {
                    map.setLayoutProperty(layer.id, "visibility", "visible");
                } else {
                    map.setLayoutProperty(layer.id, "visibility", "none");
                }
            });
        }
    }

    onMount(async () => {
        if (!urlHashParsed) {
            // get url state for layers, if any.
            const layersState = urlHash.getState();
            if (typeof layersState !== "undefined") {
                const layerSettings = layersState.split("|");

                layerSettings.forEach((l) => {
                    if (!l) return;
                    if (l.length != 3) return;

                    const id = l.substr(0, 2);

                    const i = layers.findIndex((x) => x.id == id);
                    if (i == -1) return;

                    const s = Number(l.substr(2, 1));
                    if (s == 0) {
                        layers[i].enabled = false;
                        layers[i].visible = false;
                    } else if (s == 1) {
                        layers[i].enabled = true;
                        layers[i].visible = true;
                    } else if (s == 2) {
                        layers[i].enabled = true;
                        layers[i].visible = false;
                    }
                });
            }

            layers = [...layers];
            urlHashParsed = true;
        }

        // create and add control.
        manager = new LayerControlManager(controlRoot, map, layers);
        map.addControl(manager, "bottom-right");
    });

    function onLayerToggle(i: number): void {
        layers[i].visible = !layers[i].visible;

        layers[i].layers.forEach((l) => {
            const layer = map.getLayer(l);
            const visible = layers[i].visible;

            if (typeof layer == "undefined") {
                console.warn(`Layer with id: '${l}' not found.`);
                return;
            }

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
    <nav class="layer-control">
        {#each layers as layer, i}
            {#if layer.enabled}
                <button
                    class="btn {layer.visible ? 'active' : ''}"
                    type="button"
                    on:click={() => onLayerToggle(i)}
                >
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
        background-color: rgba(0, 0, 0, 0.05);
    }

    @media (min-width: 576px) {
        .layer-control {
            display: block;
        }
    }
</style>
