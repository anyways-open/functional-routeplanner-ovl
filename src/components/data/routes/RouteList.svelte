<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import RouteRow from "./RouteRow.svelte";

    export let routes: any[] = [];

    // const dispatch = createEventDispatcher<{ select: SearchResult }>();
    function onSelect(e: CustomEvent<any>): void {
        // dispatch("select", e.detail);
    }
</script>

{#if routes.length > 0}
    <div>
        <div class="route-results">
            Results
            <div class="route-results-list">
                {#each routes as route}
                    <RouteRow {route} on:select={onSelect} />
                {/each}
            </div>
        </div>
    </div>
{/if}

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
        width: 100%;
    }
</style>
