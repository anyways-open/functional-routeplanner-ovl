<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { LocationSearchResult } from "./LocationSearchResult";
    import LocationSearchResultRow from "./LocationSearchResultRow.svelte";

    export let searchResults: LocationSearchResult[] = [];

    const dispatch = createEventDispatcher<{ select: LocationSearchResult }>();
    function onSelect(e: CustomEvent<LocationSearchResult>): void {
        dispatch("select", e.detail);
    }
</script>

{#if searchResults.length > 0}
    <div id="route-results" class="data-container btn-toolbar p-1 border-0">
        <div class="route-results">
            Results
            <div class="route-results-list">
                {#each searchResults as searchResult}
                    <LocationSearchResultRow
                        {searchResult}
                        on:select={onSelect}
                    />
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .route-results {
        position: absolute;
        top: 50px;
        left: 20px;
        right: 20px;
        color: white;
    }

    .route-results-list {
        margin-top: 8px;
        background: white;
        border-radius: 10px;
        padding: 4px;
        color: black;
    }
</style>
