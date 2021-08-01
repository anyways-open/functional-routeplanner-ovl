<script lang="ts">
    
</script>

<div id="route-results" class="data-container btn-toolbar p-1 border-0">
    <div class="route-results">
        Routes
        <div class="route-results-list">
            <div class="route-detail route-detail-selected row my-1">
                <div class="col-4 py-3">Aangeraden route</div>
                <div class="col-4 py-3">
                    <div><strong>7,96 km</strong></div>
                    <div><strong>39 min</strong></div>
                </div>
                <div class="col-2 py-3"><img src="assets/icons/bicycle.svg" alt="Fiets"></div>
                <div class="col-1 py-3"><img src="assets/icons/download.svg" alt="Download"></div>
            </div>
            <div class="route-detail row my-1">
                <div class="col-4 py-3">Alternative route</div>
                <div class="col-4 py-3">
                    <div><strong>8,37 km</strong></div>
                    <div><strong>42 min</strong></div>
                </div>
                <div class="col-2 py-3"><img src="assets/icons/bicycle.svg" alt="Fiets"></div>
                <div class="col-1 py-3"><img src="assets/icons/download.svg" alt="Download"></div>
            </div>
        </div>
    </div>
</div>

<style>
    .route-results {
        position: absolute;
        top: 50px;
        left: 20px;
        right: 20px;
        color: white;
    }

    .route-results-list {
        margin-top: 8px;
        background: white;
        border-radius: 10px;
        padding: 4px;
        color: black;
    }

    .route-results-list img {
        height: 20px;
    }

    .route-results-list .row {
        margin: 0;
    }

    .route-results-list .row:not(:last-child) {
        border-bottom: lightgray solid 1px;
    }
</style>