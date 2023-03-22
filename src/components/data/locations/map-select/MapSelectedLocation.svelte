<script lang="ts">
    import FromIcon from "../../../../svg/icons/FromIcon.svelte";
    import ToIcon from "../../../../svg/icons/ToIcon.svelte";
    import type { RoutingManager } from "../../RoutingManager";

    export let routingManager: RoutingManager;
    routingManager.listenToState(s => onStateUpdate(s));

    let location: {
        lng: number,
        lat: number,
        description?: string
    };
    let description = "";

    const onStateUpdate = (state: any) => {
        const keys = Object.keys(state);

        keys.forEach((k) => {
            switch (k) {
                case "location":
                    location = state.location;

                    description = location?.description ?? "";
                    break;
            }
        });
    };
</script>
<div class="poi-info">
<h3 class="text">{description}</h3>
</div>

<div class="profile-btn-group btn-group">
    <div class="btn btn-profile border-0" on:click={() => routingManager.onUseAs("START")}>
        <div class="button-content">
            <span>
                <FromIcon class="location-icon"/>
            </span>
            <span class="description">
                Neem als vertrekpunt
            </span>
        </div>
    </div>
    <div class="btn btn-profile border-0" on:click={() => routingManager.onUseAs("END")}>
        <div class="button-content">
            <span>
                <ToIcon class="location-icon"/>
            </span>
            <span class="description">
                Neem als bestemming
            </span>
        </div>
    </div>
</div>


<style>
    .text {
        color: #fff;
    }

    .poi-info {
        height: 50px;
    }

    .profile-btn-group {
        display: flex;
        background: #0d8bd9;
        border-radius: 10px;
        width: 100%;
        padding: 5px;
    }

    .btn-profile {
        -webkit-appearance: none;
        display: flex;
        color: #fff;
        flex-grow: 0;
        flex-basis: 50%;
    }

    .button-content {
        padding-top: 5px;
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

        .description {
            height: 37px;
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