<script lang="ts">
    import RouteFrom from "./RouteFrom.svelte";

    import RouteTo from "./RouteTo.svelte";

    export let from: string = "";
    export let to: string = "";
</script>

<div id="route-fromto py-5" class="route-fromto">
    <RouteFrom value={from} />
    <RouteTo value={to} />
    <div type="button" id="switch-button" class="btn btn-light border-0">
        <img
            src="assets/icons/updown.svg"
            alt="Verwissel start-and endpoint."
        />
    </div>
</div>

<style>
    .route-fromto #switch-button {
        position: absolute;
        right: 30px;
        top: 43px;
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
        border-top-right-radius: 0px;
        border-bottom-right-radius: 0px;
        background: #1da1f2;
        padding: 4px;
    }

    .route-fromto #switch-button img {
        height: 20px;
        width: 20px;
    }
</style>
