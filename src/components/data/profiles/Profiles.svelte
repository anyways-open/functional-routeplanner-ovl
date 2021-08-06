<script lang="ts">
    export let profile: string = "bicycle";

    function onClickBicycle(): void {
        profile = "bicycle";
    }

    function onClickBicycleNetworks(): void {
        profile = "bicycle.networks";
    }

</script>

<div class="profiles-container">
    <div class="profile-btn-group btn-group">
        <div type="button" class="btn btn-profile {profile == "bicycle" ? "active" : ""} border-0" on:click={onClickBicycle}>
            <span>
                <img src="assets/icons/bicycle.svg" alt="Snelste Route" />
            </span>
            <span>
                Functioneel fietsen
            </span>
        </div>
        <div type="button" class="btn btn-profile {profile == "bicycle.networks" ? "active" : ""} border-0" on:click={onClickBicycleNetworks}>
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
    .profile-btn-group {
        background: #0d8bd9;
        border-radius: 10px;
        width: 100%;
        padding: 4px;
    }

    .btn-profile {
        text-align: center;
        color: #fff;
        width: 50%;
        height: 100%;
        padding-top: 20px;
    }

    .btn:first-child {
        border-top-left-radius: 10px;
        border-bottom-left-radius: 10px;
    }

    .btn:last-child {
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;
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

	@media (min-width: 576px) { 
		.profiles-container {
            padding: unset;
		    bottom: unset;
		}

        .profile-btn-group {
            background: #0d8bd9;
            border-radius: 0px;
            border-bottom-left-radius: 4px;
            border-bottom-right-radius: 4px;
            width: 100%;
            padding: 4px;
        }

        .btn-profile {
            text-align: center;
            color: #fff;
            width: 50%;
            height: 100%;
            padding-top: 20px;
        }

        .btn:first-child {
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
        }

        .btn:last-child {
            border-top-right-radius: 4px;
            border-bottom-right-radius: px;
        }
	}
</style>