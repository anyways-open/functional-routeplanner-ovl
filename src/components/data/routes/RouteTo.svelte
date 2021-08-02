<script lang="ts">
    export let value: string = "";
</script>

<div class="input-group search-field">
    <div type="button" class="btn btn-light border-0" style="width: 49px;">
        <img src="assets/icons/marker.svg" style="height: 25px;" alt="Map Marker"/>
    </div>
    <input type="text" class="form-control border-0" value={value}>
</div>

<style>
    .search-field {
        background: #0d8bd9;
        border-radius: 10px;
        height: 40px;
        margin-top: 8px;
    }

    input {
        background: #0d8bd9;
        color: white;
    }
</style>

