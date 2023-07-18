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
        <div class="route-results-list">
            {#if userLocationAvailable}
                <LocationSearchUseCurrent
                    active={userLocationAvailable}
                    on:click={onUseCurrentLocation} />
            {/if}
            {#each searchResults as searchResult, i}
                <LocationSearchResultRow
                    {searchResult}
                    on:select={() => onSelect(i)} />
            {/each}
        </div>
    </div>
</div>

<style>
    .route-results {
        color: white;
        width: 100%;
        overflow-y: auto;
        height: 255px;
    }

    .route-results-list {
        margin-top: 8px;
        background: white;
        border-radius: 10px;
        padding: 4px;
        color: black;
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
        .route-results {
            overflow-y: unset;
            height: unset;
        }
        .route-results-list {
            margin-top: 0px;
            background: white;
            border-radius: unset;
            padding: 0px;
            color: black;
        }
    }
</style>
