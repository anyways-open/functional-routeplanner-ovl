<script lang="ts">
    import type { Route } from "../Route";
    import RouteRow from "./RouteRow.svelte";

    export let routes: Route[] = [];

    // const dispatch = createEventDispatcher<{ select: SearchResult }>();
    function onSelect(e: CustomEvent<any>): void {
        // dispatch("select", e.detail);
    }
</script>

{#if routes.length > 0}
    <div>
        <div class="route-results">
            <div class="d-block d-sm-none"> 
                Results
            </div>
            <div class="route-results-list">
                {#each routes as route}
                {#if typeof route !== "undefined" && 
                    typeof route.segments !== "undefined" &&
                    route.segments.length > 0}
                    <RouteRow {route} on:select={onSelect} />
                {/if}
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

    @media (min-width: 576px) { 
        .route-results-list {
            margin-top: 0px;
            border-radius: unset;
            padding: 0px;
        }
    }
</style>
