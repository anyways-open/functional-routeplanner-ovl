<script lang="ts">
    export let profile: string = "bicycle.commute";

    function onClickBicycle(): void {
        profile = "bicycle.commute";
    }

    function onClickBicycleNetworks(): void {
        profile = "bicycle.functional_network";
    }

</script>

<div class="profiles-container">
    <div class="profile-btn-group btn-group">
        <div type="button" class="btn btn-profile {profile == "bicycle.commute" ? "active" : ""} border-0" on:click={onClickBicycle}>
            <div class="button-content">
                <span>
                    <img src="assets/icons/bicycle.svg" alt="Snelste Route" />
                </span>
                <span>
                    Functioneel fietsen
                </span>
            </div>
        </div>
        <div type="button" class="btn btn-profile {profile == "bicycle.functional_network" ? "active" : ""} border-0" on:click={onClickBicycleNetworks}>
            <div class="button-content">
                <span>
                    <img src="assets/icons/network.svg" alt="Fietsnetwerken Route"/>
                </span>
                <span>
                    Fietsnetwerken
                </span>
            </div>
        </div>
    </div>
</div>

<style>
    .profile-btn-group {
        display: flex;
        background: #0d8bd9;
        border-radius: 10px;
        width: 100%;
        padding: 5px;
    }

    .btn-profile {
        display: flex;
        color: #fff;
        flex-grow: 0;
        flex-basis: 50%;
        height: 90px;
    }

    .button-content {
        text-align: center;
        align-self: center;
        width: 100%;
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