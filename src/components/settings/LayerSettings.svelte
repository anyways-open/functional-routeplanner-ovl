<script lang="ts">
    import { onMount } from "svelte";
    import { UrlHashHandler } from "../../shared/UrlHashHandler";
    import type { LayerConfig } from "../map/controls/layers/LayerConfig";

    export let layers: LayerConfig[] = [];
    let initialConfig: LayerConfig[] = [];
    layers.forEach((l) => {
        initialConfig.push(Object.assign({}, l));
    });
    let urlHashParsed = false;
    let urlHash = new UrlHashHandler("layers");

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

            urlHashParsed = true;
        }
    });

    function onLayerToggle(i: number): void {
        layers[i].visible = !layers[i].visible;

        layers = [...layers];
    }
</script>

<h2 class="mt-3 text-center">Kaartlagen</h2>

<div class="row m-2 p-2">De volgende lagen zijn beschikbaar:</div>

<div class="card p-2 m-2">
    {#each layers as layer, i}
        {#if layer.enabled}
            <div class="row align-items-center px-0">
                <div class="col-5 pe-0">
                    <button
                        class="btn {layer.visible ? 'active' : ''} border-0"
                        type="button"
                        on:click={() => onLayerToggle(i)}
                    >
                        <div class="button-content">
                            <span>
                                <div class="img-container"><img src={layer.logo} alt={layer.name} /></div>
                            </span>
                            <span>
                                {layer.name}
                            </span>
                        </div>
                    </button>
                </div>
                <div class="col">
                    {layer.description}
                </div>
            </div>
        {/if}
    {/each}
</div>

<style>
    a {
        color: white;
    }

    .card {
        background: #0d8bd9;
        box-shadow: 3px 3px 2px rgba(0, 0, 0, 0.1);
    }

    .btn {
        -webkit-appearance: none;
        display: flex;
        color: #fff;
        flex-grow: 0;
        flex-basis: 50%;
        height: 90px;
        width: 100%;
    }

    .btn.active {
        background: #1da1f2;
        border: none;
    }

    .button-content {
        text-align: center;
        align-self: center;
        width: 100%;
    }

    .btn:hover {
        border: none;
        color: white;
    }

    .btn:not(.active):hover {
        background-color: rgba(0, 0, 0, 0.05);
    }

    .btn img {
        height: 25px;
    }

    .img-container {
        width: 100%;
    }
</style>
