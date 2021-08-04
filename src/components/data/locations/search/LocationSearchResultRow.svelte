<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { SearchResult } from "../locations/search/LocationSearchResult";

    export let searchResult: SearchResult;

    let icon: string = "marker-grey";
    switch (searchResult.type) {
        case "address":
            icon = "house";
            break;
        case "building":
            icon = "building";
            break;
        case "shop":
        case "retail":
            icon = "shop";
            break;
        case "railway":
            icon = "train";
            break;
        case "bus_stop":
            icon = "bus";
            break;
        case "road":
        case "street":
            icon = "road";
            break;
        case "city":
        case "village":
        case "neighbourhood":
            icon = "city";
            break;
    }

    const dispatch = createEventDispatcher<{ select: SearchResult }>();
    function onClick(): void {
        dispatch("select", searchResult);
    }
</script>

{#if typeof searchResult !== "undefined"}
    <div class="search-result row my-1 mx-0" on:click="{onClick}">
        <div class="icon col-2 py-2">
            <img class="m-auto" src="assets/icons/{icon}.svg" alt="" />
        </div>
        <div class="col-10 py-2 p-0">{searchResult.description}</div>
    </div>
{/if}

<style>
    img {
        height: 20px;
    }

    .icon {
        text-align: center;
    }

    .search-result.row:not(:last-child) {
        border-bottom: lightgray solid 1px;
    }

    .search-result:hover {
        background-color: #9fd7f9;
    }
</style>
