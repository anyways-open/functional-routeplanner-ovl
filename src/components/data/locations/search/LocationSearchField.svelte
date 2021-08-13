<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let placeholder: string = "";
    export let value: string = "";

    const focus = createEventDispatcher();
    const input = createEventDispatcher<{ input: string }>();

    function onFocus(): void {
        focus("focus");
    }

    function onInput(e: any): void {
        input("input", e.target.value);
    }
</script>

<div class="search-control">
    <div class="input-group">
        <div type="button" class="btn btn-light border-0" style="width: 49px;">
            <img src="assets/icons/search.svg" alt="Zoek" />
        </div>
        <input
            type="text"
            class="form-control border-0"
            placeholder={placeholder}
            on:focus="{onFocus}"
            on:input="{onInput}"
            value={value}
        />
        <!-- <div type="button" class="btn btn-light border-0">
            <img src="assets/icons/close.svg" alt="Sluit" />
        </div> -->
    </div>
</div>

<style>
    .search-control {
        background: white;
        border-radius: 10px;
        padding: 5px;
        margin-top: -40px;
        box-shadow: 2px 2px 5px;
    }

    input {
        padding-left: 0px;
    }

    img {
        height: 25px;
    }
</style>
