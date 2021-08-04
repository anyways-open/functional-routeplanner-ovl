<script lang="ts">
    import Location from "./Location.svelte";
    import { createEventDispatcher } from "svelte";
    import type { LocationData } from "../../../shared/data/LocationData";
    const dispatch = createEventDispatcher();
    function onSwitch(): void {
        dispatch("switch");
    }

    const focus = createEventDispatcher<{ focus: number }>();
    function onFocus(i: number) {
        focus("focus", i);
    }

    const input =
        createEventDispatcher<{ input: { i: number; value: string } }>();
    function onInput(i: number, value: string) {
        input("input", {
            i: i,
            value: value,
        });
    }

    export let locations: LocationData[] = [];
</script>

<div class="locations-container">
    <div class="locations">
        <div>
            {#each locations as location, i}
                {#if i === 0}
                    <Location
                        data={location}
                        placeholder="Van"
                        on:focus={() => onFocus(i)}
                        on:input={(e) => onInput(i, e.detail)}
                    />
                {:else if i === 1}
                    <Location
                        data={location}
                        placeholder="Naar"
                        on:focus={() => onFocus(i)}
                        on:input={(e) => onInput(i, e.detail)}
                    />
                {:else}
                    <Location
                        data={location}
                        placeholder="Via"
                        on:focus={() => onFocus(i)}
                        on:input={(e) => onInput(i, e.detail)}
                    />
                {/if}
            {/each}
        </div>
        <div type="button" class="btn btn-light border-0" on:click={onSwitch}>
            <img
                src="assets/icons/updown.svg"
                alt="Verwissel start-and endpoint."
            />
        </div>
    </div>
</div>

<style>
    .locations-container {
        margin-top: -50px;
    }

    .locations {
        box-shadow: 2px 2px 5px;
        border-radius: 10px;
    }

    .locations .btn {
        position: absolute;
        right: 31px;
        top: -2px;
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
        background: #1da1f2;
        padding: 4px;
        z-index: 100;
    }

    .locations .btn img {
        height: 20px;
        width: 20px;
    }
</style>
