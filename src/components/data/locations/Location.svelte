<script lang="ts">
    import type { Location as LocationData } from "../Location";
    import { createEventDispatcher } from "svelte";

    // exports.
    export let data: LocationData;
    export let placeholder: string = "";
    export let type: "START" | "VIA" | "END";

    const focus = createEventDispatcher();
    function onFocus(): void {
        focus("focus");
    }

    const input = createEventDispatcher<{ input: string }>();
    function onInput(e: any): void {
        input("input", e.target.value);
    }

    let value = data.description;
    $: if (typeof data.description === "undefined") {
        value = "";
    } else {
        value = data.description;
    }
</script>

<div class="input-group">
    {#if data.isUserLocation}
        <div class="marker-via-dot-container">
            <div class="marker-via-dot" />
        </div>
    {:else if type == "END"}
        <div type="button" class="btn btn-light border-0" style="width: 49px;">
            <img
                src="assets/icons/marker.svg"
                style="height: 25px;"
                alt="Map Marker"
            />
        </div>
    {:else}
        <div class="marker-via-dot-container">
            <div class="marker-via-dot" />
        </div>
    {/if}
    <input
        type="text"
        class="form-control border-0"
        {value}
        {placeholder}
        on:focus={onFocus}
        on:input={onInput}
    />
</div>

<style>
    .input-group {
        background: #fff;
        border-radius: 0px;
        height: 40px;
        border-bottom-width: 1px;
        border-bottom-color: lightgray;
        border-bottom-style: solid;
    }

    .input-group:first-child {
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
    }

    .input-group:last-child {
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
    }

    input {
        background: #fff;
        padding-left: 0px;
        margin-right: 10px;
    }

    .marker-via-dot-container {
        padding-left: 17px;
        padding-top: 15px;
        width: 49px;
    }
</style>
