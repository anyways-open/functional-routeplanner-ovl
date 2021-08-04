<script lang="ts">
    import type { LocationData } from "../../../shared/data/LocationData";
    import { createEventDispatcher } from "svelte";

    const focus = createEventDispatcher();
    const input = createEventDispatcher<{ input: string }>();

    function onFocus(): void {
        focus("focus");
    }

    function onInput(e: any): void {
        input("input", e.target.value);
    }

    export let data: LocationData;
    export let placeholder: string = "";
    let value = data.description;
    $: if (typeof data.description === "undefined") {
        value = ""
    } else {
        value = data.description;
    }
</script>

<div class="input-group">
    {#if data.type == "USER_LOCATION"}
        <div class="marker-via-dot-container">
            <div class="marker-via-dot" />
        </div>
    {:else}
        <div type="button" class="btn btn-light border-0" style="width: 49px;">
            <img
                src="assets/icons/marker.svg"
                style="height: 25px;"
                alt="Map Marker"
            />
        </div>
    {/if}
    <input
        type="text"
        class="form-control border-0"
        value={value}
        placeholder={placeholder}
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
