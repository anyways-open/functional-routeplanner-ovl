<script lang="ts">
    export let profile: string = "bicycle.commute";

    export let profiles: {
        id: string;
        description: string;
        icon: string;
        longDescription: string;
    }[] = [
        {
            id: "bicycle.commute",
            description: "Functioneel fietsen",
            icon: "assets/icons/bicycle.svg",
            longDescription:
                "De snelste route tussen 2 punten rekening houdend met veiligheid en comfort.",
        },
        {
            id: "bicycle.functional_network",
            description: "Fietsnetwerken",
            icon: "assets/icons/network.svg",
            longDescription:
                "Een route langs de fietssnelwegen en/of het Gentse fietsknooppunten netwerk.",
        },
    ];

    function onSelect(id: string): void {
        profile = id;
    }
</script>

<h2 class="mt-3 text-center">Routeringsprofielen</h2>

<div class="row m-2 p-2">
    Met deze routeplanner kan je je woon-werk of andere functionele
    verplaatsingen plannen langs de fietsnetwerken en fietsinfrastructuur in
    Oost-Vlaanderen.
</div>
<div class="row m-2 p-2">De routeplanner heeft 2 fietsprofielen:</div>

<div class="card p-2 m-2">
    {#each profiles as p}
        <div class="row align-items-center px-2">
            <div class="col-5">
                <div
                    type="button"
                    class="btn btn-profile {profile == p.id
                        ? 'active'
                        : ''} border-0"
                    on:click={() => onSelect(p.id)}
                >
                    <div class="button-content">
                        <span>
                            <img src={p.icon} alt="Snelste Route" />
                        </span>
                        <span>
                            {p.description}
                        </span>
                    </div>
                </div>
            </div>
            <div class="col">
                {p.longDescription}
            </div>
        </div>
    {/each}
</div>

<div class="row m-2 p-2">
    <p>
        Beide profielen zijn ontworpen om zo comfortabel mogelijke fietsroutes te
        genereren op basis van <a href="https://www.openstreetmap.org/">OpenStreetMap (OSM)</a> en houden rekening
        met zaken als wegcategorie, al dan niet vrijliggende fietspaden, wegoppervlakte,
        enz.
    </p>
    <p>
        Meer technische informatie is <a href="https://docs.anyways.eu/routing-api/#bicycle">hier</a> beschikbaar.
    </p>
</div>

<style>
    a {
        color: white;
    }

    .card {
        background: #0d8bd9;
        box-shadow: 3px 3px 2px rgba(0, 0, 0, 0.1);
    }

    .btn-profile {
        -webkit-appearance: none;
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

    .btn-profile.active {
        color: #fff;
        background-color: #1da1f2;
    }

    .btn-profile:hover {
        color: #fff;
        background-color: #1da1f2;
    }
</style>
