<script lang="ts">
    import Location from "./Location.svelte";
    import { createEventDispatcher } from "svelte";
    import type { Location as LocationData } from "../Location";

    export let locations: LocationData[] = [];
    export let selected: number = -1;

    const dispatch = createEventDispatcher();
    function onSwitch(): void {
        dispatch("switch");
    }

    const focus = createEventDispatcher<{ focus: number }>();
    function onFocus(i: number) {
        selected = i;
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

    const close = createEventDispatcher<{ close: number }>();
    function onClose(i: number): void {
        close("close", i);
    }

    const add = createEventDispatcher();
    function onAdd(): void {
        add("add");
    }
</script>

<div class="locations-container {selected == -1 ? '' : 'focus'} ">
    <div class="locations">
        <div class="locations-list">
            {#each locations as location, i}
                {#if i === 0}
                    <Location
                        type="START"
                        data={location}
                        placeholder={location.isUserLocation ? "Huidige locatie" : "Van"}
                        focused={{ hasFocus: selected == i, canHaveFocus: selected != -1 }}
                        on:focus={() => onFocus(i)}
                        on:input={(e) => onInput(i, e.detail)}
                        on:close={() => onClose(i)}
                    />
                {:else if i === locations.length - 1}
                    <Location
                        type="END"
                        data={location}
                        placeholder={location.isUserLocation ? "Huidige locatie" : "Naar"}
                        focused={{ hasFocus: selected == i, canHaveFocus: selected != -1 }}
                        on:focus={() => onFocus(i)}
                        on:input={(e) => onInput(i, e.detail)}
                        on:close={() => onClose(i)}
                    />
                {:else}
                    <Location
                        type="VIA"
                        data={location}
                        placeholder={location.isUserLocation ? "Huidige locatie" : "Via"}
                        focused={{ hasFocus: selected == i, canHaveFocus: selected != -1 }}
                        on:focus={() => onFocus(i)}
                        on:input={(e) => onInput(i, e.detail)}
                        on:close={() => onClose(i)}
                    />
                {/if}
            {/each}
        </div>
        {#if selected == -1 && locations.length == 2}
            <div
                type="button"
                class="btn btn-light border-0"
                on:click={onSwitch}
            >
                <img
                    src="assets/icons/updown.svg"
                    alt="Verwissel start-en eindpoint."
                />
            </div>
        {/if}
        <div class="input-group">
            <div class="location-img-container" on:click="{onAdd}">
                <img
                    class="marker"
                    src="assets/icons/add.svg"
                    alt="Voeg locatie toe"
                />
            </div>
            <div class="input-container">
                <div class="add-location border-0 text-muted">Voeg locatie toe.</div>
            </div>
        </div>
    </div>
</div>

<style>
    .locations-container {
        margin-top: -50px;
    }

    .locations-container.focus {
        margin-top: -40px;
    }

    .locations {
        box-shadow: 2px 2px 5px;
        border-radius: 10px;
    }

    .locations .btn {
        position: absolute;
        right: 31px;
        top: 2px;
        background: #1da1f2;
        padding: 4px;
        z-index: 100;
    }

    .locations .btn img {
        height: 25px;
        width: 25px;
    }

    .input-group {
        background: #fff;
        border-radius: 0px;
        height: 40px;
        display: none;
    }

    .location-img-container {
        padding: 0.575rem 0.78rem;
        width: 49px;
    }

    img.marker {
        height: 18px;
    }

    .marker {
        margin-left: 4px;
    }

    .add-location {
        height: 32px;
        flex: 1 1 auto;
        padding-top: 9px;
    }

    .input-container {
            display: flex;
        }

    @media (min-width: 576px) {
        .locations-container {
            margin-top: unset;
            padding: 0.5rem;
        }

        .input-group {
            background: #fff;
            border-radius: 0px;
            height: 39px;
            border-bottom-style: none;
            padding-bottom: 0.25rem;
            display: flex;
        }

        .locations-container.focus {
            margin-top: unset;
        }

        .btn {
            display: none;
        }


        .locations .btn img {
            height: 20px;
            width: 20px;
        }

        .locations {
            box-shadow: none;
            border-radius: unset;
        }
    }
</style>
