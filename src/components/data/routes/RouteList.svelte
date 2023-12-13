<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import type { Route } from "../Route";
    import RouteRow from "./RouteRow.svelte";

    export let routes: Route[] = [];
    export let selected: number = -1;
    export let maxAlternatives: number = 1;

    const dispatch = createEventDispatcher<{ select: number }>();
    function onSelect(i: number): void {
        dispatch("select", i);
    }

    $: if (typeof routes !== "undefined") {
        maxAlternatives = 1;
        if (
            typeof routes[0] !== "undefined" &&
            typeof routes[0].segments !== "undefined"
        ) {
            maxAlternatives = routes[0].segments.length > 1 ? 1 : routes.length;
        }
    }
</script>

{#if routes.length > 0 && routes.findIndex((r) => typeof r !== "undefined" && typeof r.segments !== "undefined" && r.segments.length > 0) >= 0}
        <div class="route-results">
            <div class="route-results-list">
                {#each routes as route, i}
                    {#if typeof route !== "undefined" && typeof route.segments !== "undefined" && route.segments.length > 0 && i < maxAlternatives}
                        <RouteRow
                            {route}
                            selected={selected == i}
                            on:select={() => onSelect(i)}
                        />
                    {/if}
                {/each}
            </div>
        </div>
{/if}

<style>
    .route-results {
        color: white;
        width: 100%;
    }

    .route-results-list {
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
