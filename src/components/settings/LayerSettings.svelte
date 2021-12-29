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

<h3 class="pt-2">Basiskaart</h3>

<p class="pb-2">
    De basiskaart, gebaseerd op OpenStreetMap (OSM), toont specifiek informatie
    gericht op fietsers. De volgende informatie is op de kaart zichtbaar:
</p>

<div class="card p-2 m-2">
    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <div class="fietsstraat" />
        </div>
        <div class="col">
            Een fietsstraat, fietsers hebben hier voorrang en mogen niet
            voorbijgestoken worden.
        </div>
    </div>
    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <div class="fietspad" />
        </div>
        <div class="col">
            Volledig vrijliggend fietspad enkel voor fietsers en some
            voetgangers.
        </div>
    </div>
    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <div class="fietspad-aanliggend" />
        </div>
        <div class="col">
            Aanliggend fietspad, een fietspad dat deel is van de rijbaan voor
            auto verkeer.
        </div>
    </div>
    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <img
                class="eenrichting-fietsers"
                src="assets/img/icons/double-arrow-8.png"
                alt="Eenrichtingspijltjes" />
        </div>
        <div class="col">
            Een eenrichtingsstraat waar fietsers in beide richtingen mogen
            fietsen.
        </div>
    </div>
    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <img
                class="eenrichting"
                src="assets/img/icons/arrow-8.png"
                alt="Eenrichtingspijltjes" />
        </div>
        <div class="col">
            Een normale eenrichtingsstraat, ook geldig voor fietsers.
        </div>
    </div>

    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <img
                class="bicycle-parking"
                src="assets/img/icons/bicycle-parking-16.png"
                alt="Fietsparking" />
        </div>
        <div class="col">Fietsenrekken of een fietsparking.</div>
    </div>

    <div class="row align-items-center px-0 py-2">
        <div class="col-3 ms-3 legenda-item">
            <img
                class="bicycle-shop"
                src="assets/img/icons/bicycle-shop-32.png"
                alt="Fietswinkel" />
        </div>
        <div class="col">Een fietswinkel.</div>
    </div>
</div>

<h3 class="pt-2">Lagen</h3>

<div class="row m-2 p-2">De volgende lagen zijn beschikbaar:</div>

<div class="card p-2 m-2">
    {#each layers as layer, i}
        {#if layer.enabled}
            <div class="row align-items-center px-0">
                <div class="col-5 pe-0">
                    <button
                        class="btn {layer.visible ? 'active' : ''} border-0"
                        type="button"
                        on:click={() => onLayerToggle(i)}>
                        <div class="button-content">
                            <span>
                                <div class="img-container">
                                    <img src={layer.logo} alt={layer.name} />
                                </div>
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

    .legenda-item {
        height: 20px;
        background-color: white;
        border-radius: 0.25rem;
    }

    .fietsstraat {
        border-top: #0000ff85;
        border-top-style: solid;
        border-top-width: 6px;
        width: 100%;
        margin-top: 7px;
    }

    .fietspad {
        border-top: #0000ff85;
        border-top-style: solid;
        border-top-width: 3px;
        height: 3px;
        width: 100%;
        margin-top: 9px;
    }

    .fietspad-aanliggend {
        border-top: #0000ff85;
        border-top-style: dotted;
        border-top-width: 3px;
        width: 100%;
        margin-top: 9px;
    }

    .eenrichting-fietsers {
        margin-left: 17px;
    }

    .eenrichting {
        margin-left: 20px;
    }
    .bicycle-parking {
        margin-left: 20px;
    }
    .bicycle-shop {
        margin-left: 20px;
        height: 16px;
    }
</style>
