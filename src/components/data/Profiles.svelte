<script lang="ts">
    
</script>

<div class="profile-selection btn-toolbar p-1 border-0" role="toolbar">
    <div class="profile-btn-group btn-group" role="group">
        <div type="button" class="btn btn-profile active border-0">
            <span>
                <img src="assets/icons/bicycle.svg" alt="Snelste Route" />
            </span>
            <span>
                Functioneel fietsen
            </span>
        </div>
        <div type="button" class="btn btn-profile border-0">
            <span>
                <img src="assets/icons/network.svg" alt="Fietsnetwerken Route"/>
            </span>
            <span>
                Fietsnetwerken
            </span>
        </div>
    </div>
</div>

<style>
    .profile-selection {
        position: absolute;
        top: 50px;
        left: 20px;
        right: 20px;
        color: white;
    }

    .profile-btn-group {
        position: absolute;
        left: 20px;
        right: 20px;
        height: 90px;
        background: #0d8bd9;
        border-radius: 10px;
        padding: 4px;
    }

    .btn-profile {
        text-align: center;
        color: #fff;
        width: 50%;
        height: 100%;
        border-radius: 10px;
        padding-top: 20px;
    }

    .btn-profile img {
        height: 25px;
    }

    .btn-profile span {
        display: block;
    }

    .btn-profile:hover {
        color: #fff;
        background-color: #1da1f2;
    }

    .btn-profile.active {
        color: #fff;
        background-color: #1da1f2;
    }
</style>