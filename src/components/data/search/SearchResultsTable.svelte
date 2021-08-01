<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { SearchResult } from "./SearchResult";
    import SearchResultRow from "./SearchResultRow.svelte";

    export let searchResults: SearchResult[] = [];

    const dispatch = createEventDispatcher<{ select: SearchResult }>();
    function onSelect(e: CustomEvent<SearchResult>): void {
        dispatch("select", e.detail);
    }
</script>

{#if searchResults.length > 0}
<div id="route-results" class="data-container btn-toolbar p-1 border-0">
    <div class="route-results">
        Results
        <div class="route-results-list">
            {#each searchResults as searchResult}
                <SearchResultRow searchResult={searchResult} on:select={onSelect}/>
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