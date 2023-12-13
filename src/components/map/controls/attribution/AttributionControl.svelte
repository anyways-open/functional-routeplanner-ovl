<script lang="ts">
    import type { Map } from "maplibre-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../../map/map";
    import type { AttributionControlOptions } from "./AttributionControlOptions";
    import { OsmAttributionControl } from "./OsmAttributionControl";

    // exports.
    export let options: AttributionControlOptions;

    // get map from context.
    const { getMap } = getContext(key);
    const map: Map = getMap().map;

    onMount(async () => {
        const control = new OsmAttributionControl(options);

        map.addControl(control, "bottom-right");
    });
</script>

<style>
    :global(.maplibregl-ctrl-attrib-inner img) {
        height: 10px;
    }
</style>