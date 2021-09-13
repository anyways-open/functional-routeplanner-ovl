<script lang="ts">
    import CloseButton from "./CloseButton.svelte";
    import LayerSettings from "./LayerSettings.svelte";
    import RoutingProfilesSettings from "./RoutingProfilesSettings.svelte";
    import SettingsButton from "./SettingsButton.svelte";
    import BackButton from "./BackButton.svelte";
    import type { LayerConfig } from "../map/controls/layers/LayerConfig";

    export let open: boolean = true;
    export let view: string = "NONE";
    export let profile: string;
    export let layers: LayerConfig[] = [];
    export let profiles: {
        id: string;
        description: string;
        icon: string;
        longDescription: string;
    }[] = [];

    function onOpen(): void {
        open = true;
    }

    function onClose(): void {
        open = false;
        view = "NONE";
    }

    function onOpenProfiles(): void {
        view = "PROFILES";
    }

    function onOpenLayers(): void {
        view = "LAYERS";
    }

    function onCloseView(): void {
        view = "NONE";
    }
</script>

{#if open}
    <div class="full container">
        <CloseButton on:click={onClose} />

        {#if view === "NONE"}
            <div class="row p-2">
                <div class="card mt-5 my-2" on:click={onOpenProfiles}>
                    <!-- <div class="card-img-top d-flex flex-row p-4">
                        <img
                            class="w-50"
                            src="assets/icons/bicycle.svg"
                            alt="Fiets"
                        />
                        <img
                            class="w-50"
                            src="assets/icons/network.svg"
                            alt="Network"
                        />
                    </div> -->
                    <div class="card-body">
                        <h3 class="card-title">Routes plannen en gebruiken</h3>
                        <!-- <p class="card-text">
                            In deze routeplanner zijn 2 verschillende <em
                                >routeringsprofielen</em
                            >
                            beschikbaar.
                        </p> -->
                        <h3 class="btn">Meer info over routeprofielen...</h3>
                    </div>
                </div>

                <div class="card my-2" on:click={onOpenLayers}>
                    <!-- <div class="card-img-top d-flex flex-row p-4">
                        <img
                            class="w-50"
                            src="assets/icons/highway.svg"
                            alt="Fiets"
                        />
                        <img
                            class="w-50"
                            src="assets/icons/road-works.svg"
                            alt="Network"
                        />
                    </div> -->
                    <div class="card-body">
                        <h3 class="card-title">Kaartlagen</h3>
                        <!-- <p class="card-text">
                            Op kaart toont de fietsrouteplanner een aantal lagen
                            relevant voor fietsers waaronder fietssnelwegen,
                            wegenwerken, fietsknooppunten, etc.
                        </p> -->
                        <h3 class="btn">Configureer zichtbare lagen...</h3>
                    </div>
                </div>
            </div>

            <div class="row p-2">
                <ul class="list-group mx-2">
                    <a href="email:eGovgis@oost-vlaanderen.be">
                        <li class="list-group-item d-flex align-items-start">
                            <img src="assets/icons/email.svg" alt="Email" />
                            <div class="ps-2">Contact</div>
                        </li>
                    </a>
                </ul>
                <ul class="list-group mx-2">
                    <a href="email:eGovgis@oost-vlaanderen.be">
                        <li class="list-group-item d-flex align-items-start">
                            <img src="assets/icons/email.svg" alt="Email" />
                            <div class="ps-2">Meld een probleem</div>
                        </li>
                    </a>
                </ul>
                <ul class="list-group mx-2">
                    <a href="https://www.oost-vlaanderen.be/">
                        <li class="list-group-item d-flex align-items-start">
                            <img src="assets/icons/link.svg" alt="Email" />
                            <div class="ps-2">Website</div>
                        </li>
                    </a>
                </ul>
            </div>

            <div class="row p-2">
                <p class="disclaimer fs-6">
                    Dit project is <a
                        href="https://github.com/anyways-open/functional-routeplanner-ovl"
                        >open source</a
                    >, ©
                    <a href="https://www.oost-vlaanderen.be/"
                        >Provincie Oost-Vlaanderen</a
                    >, <a href="https://www.anyways.eu/">ANYWAYS BV</a><br />
                </p>
            </div>
        {:else if view == "PROFILES"}
            <BackButton on:click={onCloseView} />
            <RoutingProfilesSettings {profiles} bind:profile />
        {:else if view == "LAYERS"}
            <BackButton on:click={onCloseView} />
            <LayerSettings bind:layers />
        {/if}
    </div>
{:else}
    <SettingsButton on:click={onOpen} />
{/if}

<style>
    .full {
        overflow-y: auto;
        position: absolute;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
        background: #1da1f2;
        color: white;
        font-weight: 300;
        z-index: 3;
    }

    .card-img-top > img {
        height: 60px;
    }

    .list-group-item > img {
        height: 20px;
    }

    .row {
        margin: 1rem !important;
    }

    .disclaimer a {
        color: white;
    }

    .card {
        border: none;
        cursor: pointer;
        background: #0d8bd9;
        box-shadow: 3px 3px 2px rgba(0, 0, 0, 0.1);
    }

    .card h3 {
        color: white;
    }

    @media (min-width: 576px) {
        .full {
            right: unset;
            width: 350px;
        }
    }
</style>
