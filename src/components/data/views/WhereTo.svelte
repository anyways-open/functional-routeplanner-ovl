<script lang="ts">
    import { createEventDispatcher } from 'svelte';

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
            placeholder="Waar naartoe?"
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
        position: absolute;
        left: 20px;
        top: -10px;
        right: 20px;
        border-radius: 10px;
        padding: 5px;
        box-shadow: 2px 2px 5px;
    }

    img {
        height: 25px;
    }
</style>
