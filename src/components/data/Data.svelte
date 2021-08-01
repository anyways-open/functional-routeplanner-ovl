<script lang="ts">
    import Profiles from "./Profiles.svelte";
    import WhereTo from "./views/WhereTo.svelte";
    import List from "./List.svelte";

    let profiles: boolean = false;   
</script>

<style>
    
</style>



{#if profiles}
<Profiles/>
{/if}

<List/>