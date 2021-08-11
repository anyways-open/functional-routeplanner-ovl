<script lang="ts">
    import type { Location as LocationData } from "../Location";
    import { createEventDispatcher } from "svelte";

    // exports.
    export let data: LocationData;
    export let placeholder: string = "";
    export let type: "START" | "VIA" | "END";
    export let focused: {
        hasFocus: boolean;
        canHaveFocus: boolean;
    } = {
        hasFocus: false,
        canHaveFocus: false,
    };

    const focus = createEventDispatcher();
    function onFocus(): void {
        focus("focus");
    }

    const input = createEventDispatcher<{ input: string }>();
    function onInput(e: any): void {
        input("input", e.target.value);
    }

    const close = createEventDispatcher();
    function onClose(): void {
        close("close");
    }

    let value = data.description;
    $: if (typeof data.description === "undefined") {
        value = "";
    } else {
        value = data.description;
    }
</script>

<div
    class="input-group {focused.canHaveFocus
        ? focused.hasFocus
            ? 'focus'
            : 'no-focus'
        : ''} "
>
    <div class="location-img-container">
        {#if data.isUserLocation}
            <div class="marker-user-location">
                <div class="user-location-dot mapboxgl-marker" >
                </div>
            </div>
        {:else if type == "END"}
            <img
                class="marker"
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
            <img src="assets/icons/search.svg" alt="Zoek" />
        </button>
        <button type="button" class="btn btn-light border-0">
            <img src="assets/icons/close.svg" alt="Sluit" on:click={onClose} />
        </button>
    </div>
</div>

<style>
    .input-group {
        background: #fff;
        border-radius: 0px;
        height: 50px;
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

    img {
        height: 27px;
    }

    .btn {
        display: none;
        min-width: 29px;
        height: 29px;
        padding: 0;
    }
    .btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    .btn:focus {
        box-shadow: none;
    }

    .location-img-container {
        padding: 0.575rem 0.78rem;
        width: 49px;
    }

    input {
        height: 45px;
        flex: 1 1 auto;
        background: #fff;
        padding-left: 0px;
        margin-right: 0px;
    }

    .no-focus {
        display: none;
    }

    .input-group.focus {
        border-radius: 10px;
    }


    .marker {
        margin-left: 4px;
    }

    .marker-via-dot-container {
        padding-left: 0px;
        padding-top: 0px;
        margin-left: 5px;
        margin-top: 7px;
        width: 49px;
    }

    .marker-via-dot {
        background-color: #fff;
        border-radius: 50%;
        border: 4px solid #1da1f2;
        content: '';
        height: 18px;
        width: 18px;
        box-sizing: border-box;
        cursor: pointer;
    }

    .marker-user-location {
        padding: 0;
        width: 20px;
    }

    .user-location-dot {
        position: unset;
        margin-left: 6px;
        margin-top: 7px;
        background-color: #1da1f2;
        width: 15px;
        height: 15px;
        border-radius: 50%;
    }

    .user-location-dot::before {
        background-color: #1da1f2;
        content: "";
        border-radius: 50%;
        position: absolute;
        -webkit-animation: user-location-dot-pulse 2s infinite;
        -moz-animation: user-location-dot-pulse 2s infinite;
        -ms-animation: user-location-dot-pulse 2s infinite;
        animation: user-location-dot-pulse 2s infinite;
    }

    .user-location-dot::after {
        border-radius: 50%;
        border: 2px solid #fff;
        content: "";
        height: 15px;
        left: 0px;
        position: absolute;
        top: 0px;
        width: 15px;
        box-sizing: border-box;
        box-shadow: 0 0 3px rgba(0, 0, 0, 0.35);
    }

    @media (min-width: 576px) {


        img {
            height: 20px;
        }
        
        .btn {
            display: block;
        }

        input {
            height: 32px;
            margin-right: 10px;
        }

        .input-group {
            background: #fff;
            border-radius: 0px;
            height: 39px;
            border-bottom-style: none;
            padding-bottom: 0.25rem;
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

        .user-location-dot {
            margin-left: 4px;
            margin-top: 2px;
        }

        .marker-via-dot-container {
            margin-top: 3px;
        }

        .marker-via-dot {
            border: 3px solid #1da1f2;
            height: 14px;
            width: 14px;
        }

        .no-focus {
            display: flex;
        }
    }
</style>
