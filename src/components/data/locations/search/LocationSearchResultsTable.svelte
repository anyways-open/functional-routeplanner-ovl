<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { LocationSearchResult } from "./LocationSearchResult";
    import LocationSearchResultRow from "./LocationSearchResultRow.svelte";
    import LocationSearchUseCurrent from "./LocationSearchUseCurrent.svelte";

    export let searchResults: LocationSearchResult[] = [];
    export let userLocationAvailable: boolean = true;

    const dispatch = createEventDispatcher<{ select: number }>();
    function onSelect(i: number): void {
        dispatch("select", i);
    }

    const useCurrentLocation = createEventDispatcher();
    function onUseCurrentLocation(): void {
        useCurrentLocation("usecurrentlocation");
    }
</script>

<div id="route-results" class="data-container btn-toolbar p-1 border-0">
    <div class="route-results">
        <div class="route-results-list {userLocationAvailable ? "" : "disabled"}">
            <LocationSearchUseCurrent active={userLocationAvailable} on:click={onUseCurrentLocation}/>
        </div>
        {#if searchResults.length > 0}
            <div class="d-block d-sm-none">Results</div>
            <div class="route-results-list">
                {#each searchResults as searchResult, i}
                    <LocationSearchResultRow
                        {searchResult}
                        on:select={() => onSelect(i)}
                    />
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .route-results {
        color: white;
        width: 100%;
    }

    .route-results-list {
        margin-top: 8px;
        background: white;
        border-radius: 10px;
        padding: 4px;
        color: black;
    }

    .disabled {
        background-color: lightgray;
    }

    @media (min-width: 576px) {
        .route-results-list {
            margin-top: 0px;
            background: white;
            border-radius: unset;
            padding: 0px;
            color: black;
        }
    }
</style>
