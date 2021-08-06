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
    <div class="location-img-container">
        {#if data.isUserLocation}
            <div class="marker-via-dot-container">
                <div class="marker-via-dot" />
            </div>
        {:else if type == "END"}
                <img class="marker"
                    src="assets/icons/marker.svg"
                    alt="Map Marker"
                />
        {:else}
            <div class="marker-via-dot-container">
                <div class="marker-via-dot" />
            </div>
        {/if}
    </div>
    <div class="input-container">
        <input
            type="text"
            class="form-control border-0"
            {value}
            {placeholder}
            on:focus={onFocus}
            on:input={onInput}
        />
        <button type="button" class="btn btn-light border-0">
            <img src="assets/icons/search.svg" alt="Zoek">
        </button>
        <button type="button" class="btn btn-light border-0">
            <img src="assets/icons/close.svg" alt="Sluit">
        </button>
    </div>
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

    img {
        height: 20px;
    }

    .marker-via-dot-container {
        width: 49px;
    }

    .btn {
        display: none;
    }


    .marker {
            margin-left:4px;
        }

    .marker-via-dot-container {
            padding-left: 0px;
            padding-top: 0px;
            margin-left:5px;
            margin-top:3px;
        }

    .location-img-container {
            padding:.575rem .78rem;
            width:49px;
        }
        input {
            height: 32px;
            flex: 1 1 auto;
        }

	@media (min-width: 576px) { 

        .btn {
            display: block;
        }

        .input-group {
            background: #fff;
            border-radius: 0px;
            height: 39px;
            border-bottom-style: none;
            padding-bottom: .25rem;
        }

        .input-container {
            display: flex;
            border-bottom: 1px;
            border-bottom-style: solid;
            border-bottom-color: #c2c2c2;
        }
        
		.input-group:first-child {
            border-top-left-radius: unset;
            border-top-right-radius: unset;
        }

        .input-group:last-child {
            border-bottom-left-radius: unset;
            border-bottom-right-radius: unset;
        }
	}
</style>
