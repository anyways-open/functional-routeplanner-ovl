<script lang="ts">
    import { createEventDispatcher } from "svelte";
    export let profile: string = "bicycle.commute";

    export let profiles: { id: string, description: string, icon: string}[] = [
        {
            id: "bicycle.commute",
            description: "Fietsen",
            icon:"assets/icons/bicycle.svg"
        },
        {
            id: "bicycle.functional_network",
            description: "Fietsen langs netwerken",
            icon: "assets/icons/network.svg"
        }
    ];

    const dispatch = createEventDispatcher<{ profile: string }>();
    function onSelect(id: string): void {
        profile = id;
        dispatch("profile", id);
    }

</script>

<div class="profiles-container">
    <div class="profile-btn-group btn-group">
        {#each profiles as p}
        <div type="button" class="btn btn-profile {profile == p.id ? "active" : ""} border-0" on:click={() => onSelect(p.id)}>
            <div class="button-content">
                <span>
                    <img src="{p.icon}" alt="Snelste Route" />
                </span>
                <span class="description">
                    {p.description}
                </span>
            </div>
        </div>
        {/each}
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

    .description {
        height: 37px;
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