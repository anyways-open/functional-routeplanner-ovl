<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let route: any;


    const dispatch = createEventDispatcher<{ select: any }>();
    function onClick(): void {
        dispatch("select", route);
    }
</script>

{#if typeof route !== "undefined"}
    <div class="route-detail route-detail-selected row my-1" on:click="{onClick}">
        <div class="col-4 py-3">Aangeraden route</div>
        <div class="col-4 py-3">
            <div><strong>7,96 km</strong></div>
            <div><strong>39 min</strong></div>
        </div>
        <div class="col-2 py-3"><img src="assets/icons/bicycle.svg" alt="Fiets"></div>
        <div class="col-1 py-3"><img src="assets/icons/download.svg" alt="Download"></div>
    </div>
{/if}

<style>
    img {
        height: 20px;
    }

    .row {
        margin: 0;
    }

    .row:not(:last-child) {
        border-bottom: lightgray solid 1px;
    }
</style>
