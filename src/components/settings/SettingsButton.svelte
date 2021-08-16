<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const click = createEventDispatcher();
    function onClick(): void {
        click("click");
    }
</script>

<div class="img-container" on:click={onClick}>
    <img src="assets/icons/settings.svg" alt="Open Instellingen" />
</div>

<style>
    .img-container {
        border-radius: 50%;
        background-color: white;
        position: absolute;
        width: 30px;
        height: 30px;
        top: 15px;
        right: 15px;
    }

    img {
        position: relative;
        top: 1px;
        left: 5px;
        width: 20px;
        height: 20px;
    }

    @media (min-width: 576px) {
        img {
            top: 5px;
        }
    }
</style>
