<script lang="ts">
    import { createEventDispatcher } from 'svelte';
	import * as turf from "@turf/turf";
    // REMARK: import locally, npm package broken in strict mode.
    import togpx from "../../../../public/npm/togpx/index";

    export let route: {description: string, segments: any[] };
    let routeDetail = { distance: 0, time: 0 };

    function formatDistance(distance: number) {
        if (distance < 1000) {
            return "" + Math.round(distance) + " m";
        }
        return "" + ((distance / 1000).toFixed(2) + " km").replace(".", ",");
    }

    function formatTime(time: number) {
        if (time < 60) {
            return `< 1 min`;
        }
        if (time < 3600) {
            return `${Math.round(time / 60)} min`;
        }
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        return `${h} uur, ${m}`;
    }

    $: if (typeof route !== "undefined") {
        routeDetail = { distance: 0, time: 0 }

        // add regular route.
        const routeSegments = route.segments;
        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            if (!routeSegment) continue;

            const geojson = routeSegment as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

            if (geojson && geojson.features) {
                let routeDistance = 0;
                let routeTime = 0;

                geojson.features.forEach((f) => {
                    if (f && f.properties) {
                        if (f.properties.distance) {
                            routeDistance = parseFloat(f.properties.distance);
                        }
                        if (f.properties.time) {
                            routeTime = parseFloat(f.properties.time);
                        }
                    }
                });
                routeDetail.distance += routeDistance;
                routeDetail.time += routeTime;
            }
        }
    }

    function exportGpx(): void {
         // convert to a single linestring per segment.
         var features = [];
        route.segments.forEach((r) => {
            const coordinates = [];
            r.features.forEach(f => {
                if (f.geometry.type == "LineString") {
                    if (coordinates.length == 0) {
                        coordinates.push(...f.geometry.coordinates);
                    } else {
                        coordinates.push(...f.geometry.coordinates.slice(1));
                    }
                } else {
                    features.push(f);
                }
            });

            features.push(turf.lineString(coordinates));
        });
        var geojson = turf.featureCollection(features);

        var gpx = togpx(geojson, {});

        var data = gpx;
        var type = "application/gpx+xml";
        var filename = "route.gpx";

        var file = new Blob([data], { type: type });
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    const dispatch = createEventDispatcher<{ select: any }>();
    function onClick(): void {
        dispatch("select", route);
    }
</script>

{#if typeof route !== "undefined" && routeDetail.distance > 0}
    <div class="route-detail route-detail-selected row my-1" on:click="{onClick}">
        <div class="col-6 py-3">{route.description}</div>
        <div class="col-4 py-3">
            <div><strong>{formatDistance(routeDetail.distance)}</strong></div>
            <div><strong>{formatTime(routeDetail.time)}</strong></div>
        </div>
        <div class="col-2 py-3"><img src="assets/icons/download.svg" alt="Download" on:click="{exportGpx}"></div>
    </div>
{/if}

<style>
    img {
        height: 20px;
    }

    .row {
        margin: 0;
    }

    .row:not(:last-child) {
        border-bottom: lightgray solid 1px;
    }
</style>
