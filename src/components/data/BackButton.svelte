<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const click = createEventDispatcher();
    function onClick(): void {
        click("click");
    }
</script>

<div class="img-container" on:click={onClick}>
    <img src="assets/icons/back.svg" alt="Sluit" />
</div>

<style>
    .img-container {
        border-radius: 50%;
        background-color: white;
        position: fixed;
        width: 35px;
        height: 35px;
        top: 15px;
        left: 15px;
        box-shadow: 3px 3px 2px rgba(0, 0, 0, 0.1);
    }

    img {
        position: relative;
        top: 3px;
        left: 5px;
        width: 25px;
        height: 25px;
    }

    @media (min-width: 576px) {
        .img-container {
            display: none;
        }
    }
</style>
