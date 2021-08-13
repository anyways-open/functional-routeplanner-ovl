<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let active: boolean = true;

    const click = createEventDispatcher();
    function onClick(): void {
        click("click");
    }
</script>

    <div class="search-result row my-1 mx-0 {active ? "" : "disabled"}" on:click="{onClick}">
        <div class="col-2 py-2">
            <div class="marker-user-location">
                <div class="user-location-dot mapboxgl-marker" >
                </div>
            </div>
        </div>
        {#if active}
        <div class="col-10 py-2 p-0">Gebruik huidige locatie.</div>
        {:else}
        <div class="col-10 py-2 p-0">Huidige locatie niet beschikbaar.</div>
        {/if}
    </div>

<style>
    .marker-user-location {
        padding: 0;
        width: 20px;
    }

    .user-location-dot {
        position: unset;
        margin-left: 6px;
        margin-top: 4px;
        background-color: #1da1f2;
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .user-location-dot::before {
        background-color: #1da1f2;
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 50%;
        position: absolute;
        -webkit-animation: user-location-dot-pulse 2s infinite;
        -moz-animation: user-location-dot-pulse 2s infinite;
        -ms-animation: user-location-dot-pulse 2s infinite;
        animation: user-location-dot-pulse 2s infinite;
    }

    .user-location-dot::after {
        border-radius: 50%;
        border: 2px solid #fff;
        content: "";
        height: 14px;
        left: -2px;
        position: absolute;
        top: -2px;
        width: 14px;
        box-sizing: border-box;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.35);
    }
    
    .search-result.row:not(:last-child) {
        border-bottom: lightgray solid 1px;
    }

    .search-result:hover {
        background-color: #9fd7f9;
    }

    .disabled {
        color: gray;
    }

    @media (min-width: 576px) { 

        .search-result.row:not(:last-child) {
            border-bottom: unset;
        }
    }
</style>
