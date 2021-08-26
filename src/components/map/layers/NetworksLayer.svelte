<script lang="ts">
    import type { Map } from "mapbox-gl";
    import { onMount, getContext } from "svelte";
    import { key } from "../../map/map";
    import type { MapHook } from "../MapHook";

    const { getMap } = getContext(key);
    const mapAndHook = getMap();
    const map: Map = mapAndHook.map;
    const mapHook: MapHook = mapAndHook.hook;

    onMount(async () => {
        map.on("load", () => {
            // get the best before layer.
            const style = map.getStyle();
            let before: string = undefined;
            for (let l = 0; l < style.layers.length; l++) {
                const layer = style.layers[l];

                if (layer && layer["source-layer"] === "transportation_name") {
                    if (!before) {
                        before = layer.id;
                    }
                }

                if (layer && layer["source"] == "route") {
                    if (!before) {
                        before = layer.id;
                    }
                }
            }

            map.addSource("cyclenetworks-tiles", {
                type: "vector",
                url: "https://staging.anyways.eu/api/vector-tiles/cyclenetworks/mvt.json",
                //url: "https://staging.anyways.eu/prod/tiles/cyclenetworks/mvt.json",
                //url: "https://api.anyways.eu/tiles/cyclenetworks/mvt.json",
            });

            const nodesColor = "#446372";
            const cycleHighwaysColor = "rgb(0, 129, 198)";
            const schoolRoutesColor = "#00cc00";
            const bffRoutesColor = "#cc0000";

            const nonExistingInfra = [
                "all",
                ["!=", "highway", "construction"],
                ["!=", "highway", "proposed"],
                ["!=", "highway", "no"],
            ];

            const cycleHighwaysFilter = [
                "all",
                ["==", "cycle_highway", "yes"],
                [
                    "all",
                    nonExistingInfra,
                    ["!=", "state", "proposed"],
                    ["!=", "state", "temporary"],
                ],
            ];

            const cycleHighwaysFilterProposed = [
                "all",
                ["==", "cycle_highway", "yes"],
                ["all", nonExistingInfra, ["==", "state", "proposed"]],
            ];

            const cycleHighwaysFilterTemporary = [
                "all",
                ["==", "cycle_highway", "yes"],
                ["all", nonExistingInfra, ["==", "state", "temporary"]],
            ];

            map.addLayer(
                {
                    id: "cycle-highways-case",
                    type: "line",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenetwork",
                    layout: Object.assign(
                        mapHook.defaultLayerState["cycle-highways-case"]
                            ?.layout ?? {},
                        {
                            "line-join": "round",
                            "line-cap": "round",
                        }
                    ),
                    paint: {
                        "line-color": "#fff",
                        "line-gap-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            3,
                            12,
                            3,
                            16,
                            3,
                        ],
                        "line-width": 2,
                    },
                    filter: ["any", cycleHighwaysFilter],
                },
                before
            );

            map.addLayer(
                {
                    id: "cycle-highways-case-proposed",
                    type: "line",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenetwork",
                    layout: Object.assign(
                        mapHook.defaultLayerState["cycle-highways-case"]
                            ?.layout ?? {},
                        {
                            "line-join": "round",
                            "line-cap": "round",
                        }
                    ),
                    paint: {
                        "line-color": "#fff",
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            2,
                            12,
                            3,
                            16,
                            3,
                        ],
                    },
                    filter: [
                        "any",
                        cycleHighwaysFilterProposed,
                        cycleHighwaysFilterTemporary,
                    ],
                },
                before
            );

            map.addLayer(
                {
                    id: "cycle-node-network-case",
                    type: "line",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenetwork",
                    layout: Object.assign(
                        mapHook.defaultLayerState["cycle-node-network-case"]
                            ?.layout ?? {},
                        {
                            "line-join": "round",
                            "line-cap": "round",
                        }
                    ),
                    paint: {
                        "line-color": "#fff",
                        "line-gap-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            3,
                            12,
                            3,
                            16,
                            3,
                        ],
                        "line-width": 2,
                    },
                    filter: ["all", ["==", "cycle_network", "srfn_gent"]],
                },
                before
            );

            map.addLayer(
                {
                    id: "cyclenetworks-genk",
                    type: "line",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenetwork",
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                    },
                    paint: {
                        "line-color": ["get", "colour"],
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            1,
                            13,
                            3,
                            16,
                            7,
                        ],
                        "line-opacity": 0.9,
                    },
                    filter: [
                        "all",
                        ["==", "$type", "LineString"],
                        ["all", ["==", "operator", "Stad Genk"]],
                    ],
                },
                before
            );

            map.addLayer({
                id: "cyclenetworks-genk-shields",
                type: "symbol",
                source: "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                minzoom: 14,
                maxzoom: 24,
                layout: {
                    "icon-image": "network-{ref}-shield",
                    "icon-rotation-alignment": "viewport",
                    "icon-size": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        15,
                        0.5,
                        18,
                        1,
                    ],
                    "icon-padding": 25,
                    "symbol-placement": "line",
                    "symbol-sort-key": ["-", 10, ["get", "ref"]], // { "type": "identity", "property": "ref" },
                    "symbol-spacing": 10000,
                },
                filter: [
                    "all",
                    ["==", "$type", "LineString"],
                    ["all", ["==", "operator", "Stad Genk"]],
                ],
            });

            map.addLayer(
                {
                    id: "cyclenetworks-brussels",
                    type: "line",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenetwork",
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                    },
                    paint: {
                        "line-color": ["get", "colour"],
                        "line-width": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            10,
                            1,
                            13,
                            3,
                            16,
                            7,
                        ],
                        "line-opacity": 0.9,
                    },
                    filter: ["all", ["==", "operator", "Brussels Mobility"]],
                },
                before
            );

            map.addLayer({
                id: "cyclenetworks-brussels-shields",
                type: "symbol",
                source: "cyclenetworks-tiles",
                "source-layer": "cyclenetwork",
                minzoom: 10,
                maxzoom: 24,
                layout: {
                    "icon-image": "us-state_{ref_length}",
                    "icon-rotation-alignment": "viewport",
                    "icon-size": 1,
                    "symbol-placement": {
                        base: 1,
                        stops: [
                            [10, "point"],
                            [11, "line"],
                        ],
                    },
                    "symbol-spacing": 200,
                    "text-field": "{ref}",
                    "text-font": ["Noto Sans Regular"],
                    "text-rotation-alignment": "viewport",
                    "text-size": 10,
                },
                filter: ["all", ["==", "operator", "Brussels Mobility"]],
            });

            map.loadImage("assets/img/icons/fietssnelwegen-128.png", (e, i) => {
                if (e) throw e;

                map.addImage("cycle-highway-shield", i);

                map.addLayer(
                    {
                        id: "cycle-node-network",
                        type: "line",
                        source: "cyclenetworks-tiles",
                        "source-layer": "cyclenetwork",
                        layout: Object.assign(
                            mapHook.defaultLayerState["cycle-node-network"]
                                ?.layout ?? {},
                            {
                                "line-join": "round",
                                "line-cap": "round",
                            }
                        ),
                        paint: {
                            "line-color": nodesColor,
                            "line-width": [
                                "interpolate",
                                ["linear"],
                                ["zoom"],
                                10,
                                3,
                                12,
                                3,
                                16,
                                3,
                            ],
                        },
                        filter: ["all", ["==", "cycle_network", "srfn_gent"]],
                    },
                    before
                );

                map.addLayer({
                    id: "cyclenodes-circles",
                    type: "circle",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenodes",
                    minzoom: 12.5,
                    layout: Object.assign(
                        mapHook.defaultLayerState["cyclenodes-circles"]
                            ?.layout ?? {},
                        {}
                    ),
                    paint: {
                        "circle-stroke-width": 2,
                        "circle-stroke-color": nodesColor,
                        "circle-radius": 10,
                        "circle-color": "#000000",
                        "circle-opacity": 0,
                    },
                    filter: ["all", ["==", "cycle_network", "srfn_gent"]],
                });

                map.addLayer({
                    id: "cyclenodes-circles-center",
                    type: "circle",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenodes",
                    minzoom: 12.5,
                    layout: Object.assign(
                        mapHook.defaultLayerState["cyclenodes-circles-center"]
                            ?.layout ?? {},
                        {}
                    ),
                    paint: {
                        "circle-radius": 10,
                        "circle-color": "#fff",
                    },
                    filter: ["all", ["==", "cycle_network", "srfn_gent"]],
                });

                map.addLayer({
                    id: "cyclenodes-labels",
                    type: "symbol",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenodes",
                    minzoom: 12.5,
                    layout: Object.assign(
                        mapHook.defaultLayerState["cyclenodes-labels"]
                            ?.layout ?? {},
                        {
                            "text-field": "{lcn_ref}",
                            "text-size": 13,
                        }
                    ),
                    paint: {
                        "text-color": nodesColor,
                        "text-halo-color": nodesColor,
                        "text-halo-width": 0.5,
                        "text-halo-blur": 0,
                    },
                    filter: ["all", ["==", "cycle_network", "srfn_gent"]],
                });

                map.addLayer(
                    {
                        id: "cycle-highways",
                        type: "line",
                        source: "cyclenetworks-tiles",
                        "source-layer": "cyclenetwork",
                        layout: Object.assign(
                            mapHook.defaultLayerState["cycle-highways"]
                                ?.layout ?? {},
                            {
                                "line-join": "round",
                                "line-cap": "round",
                            }
                        ),
                        paint: {
                            "line-color": cycleHighwaysColor,
                            "line-width": [
                                "interpolate",
                                ["linear"],
                                ["zoom"],
                                10,
                                3,
                                12,
                                3,
                                16,
                                3,
                            ],
                        },
                        filter: cycleHighwaysFilter,
                    },
                    before
                );

                map.addLayer(
                    {
                        id: "cycle-highways-proposed-high",
                        type: "line",
                        maxzoom: 12,
                        source: "cyclenetworks-tiles",
                        "source-layer": "cyclenetwork",
                        layout: Object.assign(
                            mapHook.defaultLayerState["cycle-highways"]
                                ?.layout ?? {},
                            {
                                "line-join": "round",
                                "line-cap": "round",
                            }
                        ),
                        paint: {
                            "line-color": cycleHighwaysColor,
                            "line-width": [
                                "interpolate",
                                ["linear"],
                                ["zoom"],
                                10,
                                1,
                                12,
                                2,
                                16,
                                3,
                            ],
                        },
                        filter: [
                            "any",
                            cycleHighwaysFilterTemporary,
                            cycleHighwaysFilterProposed,
                        ],
                    },
                    before
                );

                map.addLayer(
                    {
                        id: "cycle-highways-proposed",
                        type: "line",
                        minzoom: 12,
                        source: "cyclenetworks-tiles",
                        "source-layer": "cyclenetwork",
                        layout: Object.assign(
                            mapHook.defaultLayerState["cycle-highways"]
                                ?.layout ?? {},
                            {
                                "line-join": "round",
                                "line-cap": "round",
                            }
                        ),
                        paint: {
                            "line-color": cycleHighwaysColor,
                            "line-width": [
                                "interpolate",
                                ["linear"],
                                ["zoom"],
                                10,
                                1,
                                12,
                                2,
                                16,
                                3,
                            ],
                            "line-dasharray": [0.1, 2],
                        },
                        filter: [
                            "any",
                            cycleHighwaysFilterTemporary,
                            cycleHighwaysFilterProposed,
                        ],
                    },
                    before
                );

                map.addLayer({
                    id: "cycle-highways-labels-shields",
                    type: "symbol",
                    source: "cyclenetworks-tiles",
                    "source-layer": "cyclenetwork",
                    minzoom: 12.5,
                    layout: Object.assign(
                        mapHook.defaultLayerState[
                            "cycle-highways-labels-shields"
                        ]?.layout ?? {},
                        {
                            "text-field": "{ref}",
                            "text-size": 11,
                            "text-offset": [0, 0.3],
                            "text-rotation-alignment": "viewport",
                            "icon-image": "cycle-highway-shield",
                            "icon-size": 0.3,
                            "icon-rotation-alignment": "viewport",
                            "symbol-placement": "line",
                            "symbol-spacing": 200,
                        }
                    ),
                    paint: {
                        "text-color": "#FFFFFF",
                        "text-halo-width": 0.5,
                        "text-halo-color": "#FFFFFF",
                    },
                    filter: cycleHighwaysFilter,
                });
            });
        });
    });
</script>
