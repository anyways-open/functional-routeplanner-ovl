import { Map, LngLatLike, GeolocateControl, NavigationControl } from "mapbox-gl";
import { Profile, RoutingApi } from "@anyways-open/routing-api";
import { LayerControl } from "./components/layer-control/LayerControl";
import { OsmAttributionControl } from "./components/osm-attribution-control/OsmAttributionControl";
//import { EventBase, RoutingComponent } from "./components/routing-options/RoutingComponent";
//import "./components/routing-options/RoutingComponent.css";
import { ProfilesEvent } from "./components/routing-options/events/ProfilesEvent";
import "bootstrap";
import { StateEvent } from "./components/routing-options/events/StateEvent";
import { GeocodingControl } from "./components/geocoder/GeocoderControl";
import { BaseLayerControl } from "./components/baselayer-control/BaseLayerControl";
import BaseLayerImages from "./assets/img/base-layers/*.png";
import SvgIcons from "./assets/img/icons/*.svg";
import PngIcons from "./assets/img/icons/*.png";
import { Data } from "./data";
import { LegendaControl } from "./components/legenda/Legenda";
import { HelpButton } from "./components/help-button/HelpButton";
import { OpenCageDataProvider } from "./components/geocoder/Providers/OpenCageDataProvider";
import { CrabGeolocationProvider } from "./components/geocoder/Providers/CrabGeolocationProvider";
import { ChainedProvider } from "./components/geocoder/Providers/ChainedProvider";
import { UrlParamHandler } from "./components/url-hash/URLHashHandler";
import { triangleGrid } from "@turf/turf";
import * as turf from "@turf/turf";
import { MobileControl } from "./components/mobile-control/MobileControl";


const urlHasher = new UrlParamHandler();
const urlState = urlHasher.getState();

// parse the map state.
const mapState: {
    center: LngLatLike
    zoom: number
} = {
    center: [3.74475, 51.04774],
    zoom: 10.51
}
if (typeof urlState.map !== "undefined") {
    const parts = urlState.map.split("/");

    if (parts.length === 3) {
        mapState.center = [parseFloat(parts[1]), parseFloat(parts[2])];
        mapState.zoom = parseInt(parts[0], 10);
    }
}

function initialize(style: any) {

    const map = new Map({
        container: "map",
        style: style,
        center: mapState.center,
        zoom: mapState.zoom,
        preserveDrawingBuffer: true,
        attributionControl: false,
        maxZoom: 18
    });

    let routingEndpoint = "https://staging.anyways.eu/routing-api2/";
    //let routingEndpoint = "https://routing.anyways.eu/api/";
    if (urlState.host === "staging") {
        console.log("Using staging server");
        routingEndpoint = "https://staging.anyways.eu/routing-api/";
    } else if (urlState.host === "debug") {
        console.log("Using localhost server - you might want to disable CORS-rules");
        routingEndpoint = "http://localhost:5000/"
    }

    const maxReverseDistance = 100;
    const geocoder = new ChainedProvider([{
        provider: new CrabGeolocationProvider(),
        chainForward: (_, current) => {
            const results = [];
            let next = current.length == 0;
            current.forEach(x => {
                if (x.type == "commune") {
                    next = true;
                    return;
                };

                results.push(x);
            });

            results.sort((x, y) => {
                if (x.score < y.score) return -1;
                return 1;
            });
            console.log(results);

            return { next: next, results: results };
        },
        chainReverse: (l, _, current) => {
            let next = current.length == 0;
            if (current.length > 0) {
                const dist = turf.distance([l.lng, l.lat], [current[0].location.lng, current[0].location.lat]) * 1000;

                if (dist > maxReverseDistance) {
                    next = true;
                    current = [];
                }
            }
            return { next: next, results: current };
        }
    },
    {
        provider: new OpenCageDataProvider("dcec93be31054bc5a260386c0d84be98", {
            language: "nl"
        })
    }], {
        maxResults: 5,
        maxReverseDistance: maxReverseDistance
    });
    // const ra = new RoutingApi(routingEndpoint, "Vc32GLKD1wjxyiloWhlcFReFor7aAAOz");
    // const rc = new RoutingComponent(ra, {
    //     geocoder: new GeocodingControl(geocoder, {
    //         forwardPreprocessor: (q) => {
    //             if (q && q.string && q.string.toLowerCase().startsWith("station")) {
    //                 q = {
    //                     string: q.string.substring(7),
    //                     location: q.location
    //                 };
    //             }
    //             return q;
    //         }
    //     }),
    //     profiles: [{
    //         id: "bicycle.commute",
    //         description: "Functioneel fietsen",
    //         image: SvgIcons["bicycle"]
    //     }, {
    //         id: "bicycle.functional_network",
    //         description: "Fietsnetwerken",
    //         image: SvgIcons["network"]
    //     }]
    // });

    const osmAttributionControl = new OsmAttributionControl({
        compact: true,
        customAttribution: "<a href=\"https://www.anyways.eu/\">ANYWAYS BV</a> | <a href=\"https://www.oost-vlaanderen.be/\">Prov. Oost-Vlaanderen</a>"
    });
    map.addControl(osmAttributionControl);

    const nav = new NavigationControl({
        visualizePitch: true
    });
    map.addControl(nav, "top-right");

    // const geolocationControl = new GeolocateControl({
    //     positionOptions: {
    //         enableHighAccuracy: true
    //     },
    //     showAccuracyCircle: true,
    //     showUserLocation: true,
    //     trackUserLocation: false
    // })
    // map.addControl(geolocationControl, "top-right");

    // geolocationControl.on("geolocate", function (data: { coords: { latitude: any; longitude: any; }; }) {
    //     rc.reportCurrentLocation({
    //         lat: data.coords.latitude,
    //         lng: data.coords.longitude
    //     });
    // });

    // const baseLayerControl = new BaseLayerControl({
    //     source: "aiv",
    //     images: {
    //         map: BaseLayerImages["map"],
    //         imagery: BaseLayerImages["sattelite"],
    //     }
    // });
    // map.addControl(baseLayerControl, "bottom-right");

    // const legendaControl = new LegendaControl();
    // map.addControl(legendaControl, "top-left");

    // const helpButton = new HelpButton();
    // helpButton.on("open", () => legendaControl.toggle());
    // map.addControl(helpButton, "top-right");

    // const mobileControl = new MobileControl();
    // map.addControl(mobileControl);

    map.on("load", () => {
    //     // geolocationControl.trigger();

        map.addSource("aiv", {
            "type": "raster",
            "tiles": ["https://tile.informatievlaanderen.be/ws/raadpleegdiensten/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=omwrgbmrvl&STYLE=&FORMAT=image/png&tileMatrixSet=GoogleMapsVL&tileMatrix={z}&tileRow={y}&tileCol={x}"],
            "tileSize": 256,
            "attribution": "AIV"
        });

        map.addSource('gipod-con', {
            'type': 'raster',
            'tiles': [
                'https://geoservices.informatievlaanderen.be/raadpleegdiensten/gipodpubliek/wms?SERVICE=WMS&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=default&VERSION=1.3.0&LAYERS=WoCon&WIDTH=1905&HEIGHT=303&CRS=EPSG:3857&BBOX={bbox-epsg-3857}'
            ],
            'tileSize': 256
        });

        map.addSource('gipod-icon', {
            'type': 'raster',
            'tiles': [
                'https://geoservices.informatievlaanderen.be/raadpleegdiensten/gipodpubliek/wms?SERVICE=WMS&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=TRUE&STYLES=default&VERSION=1.3.0&LAYERS=WoIcoon&WIDTH=1905&HEIGHT=303&CRS=EPSG:3857&BBOX={bbox-epsg-3857}'
            ],
            'tileSize': 256
        });

        function updateMapUrlState() {
            const center = map.getCenter();
            urlState.map = `${map.getZoom().toFixed(2)}/${center.lng.toFixed(5)}/${center.lat.toFixed(5)}`;

            urlHasher.update(urlState);
        }
        if (typeof urlState.map === "undefined") {
            updateMapUrlState();
        }

        map.on("moveend", () => {
            updateMapUrlState();
        });

        // get lowest label and road.
        const style = map.getStyle();
        let lowestRoad = undefined;
        let lowestLabel = undefined;
        let lowestSymbol = undefined;
        for (let l = 0; l < style.layers.length; l++) {
            const layer = style.layers[l];

            if (layer && layer["source-layer"] === "transportation") {
                if (!lowestRoad) {
                    lowestRoad = layer.id;
                }
            }

            if (layer && layer["source-layer"] === "transportation_name") {
                if (!lowestLabel) {
                    lowestLabel = layer.id;
                }
            }

            if (layer && layer.type == "symbol") {
                if (!lowestSymbol) {
                    lowestSymbol = layer.id;
                }
            }
        }

        map.addSource("cyclenetworks-tiles", {
            type: "vector",
            url: "https://api.anyways.eu/tiles/cyclenetworks/mvt.json"
        });

        map.addLayer({
            "id": "cycle-highways-case",
            "type": "line",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenetwork",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#fff",
                "line-gap-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 3,
                    12, 3,
                    16, 3
                ],
                "line-width": 2
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_highway",
                    "yes"
                ],
                [
                    "!=",
                    "state",
                    "proposed"
                ]
            ]
        }, lowestLabel);

        const nodesColor = "#ccad00";
        const schoolRoutesColor = "#00cc00";
        const bffRoutesColor = "#cc0000";

        map.addLayer({
            "id": "cycle-node-network-case",
            "type": "line",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenetwork",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#fff",
                "line-gap-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 3,
                    12, 3,
                    16, 3
                ],
                "line-width": 2
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_network",
                    "srfn_gent"
                ]
            ]
        }, lowestLabel);

        map.addLayer({
            "id": "cycle-highways",
            "type": "line",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenetwork",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#ff0000",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 3,
                    12, 3,
                    16, 3
                ]
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_highway",
                    "yes"
                ],
                [
                    "!=",
                    "state",
                    "proposed"
                ]
            ]
        }, lowestLabel);

        map.addLayer({
            "id": "cycle-highways-labels",
            "type": "symbol",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenetwork",
            "minzoom": 12.5,
            "layout": {
                "text-field": "{ref}",
                "text-size": 15,
                "symbol-placement": "line",
                "symbol-spacing": 100
            },
            "paint": {
                "text-color": "#ff0000",
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 1.5,
                "text-halo-blur": 1
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_highway",
                    "yes"
                ],
                [
                    "!=",
                    "state",
                    "proposed"
                ]
            ]
        });

        map.addLayer({
            "id": "cycle-node-network",
            "type": "line",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenetwork",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": nodesColor,
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 3,
                    12, 3,
                    16, 3
                ]
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_network",
                    "srfn_gent"
                ]
            ]
        }, lowestLabel);

        map.addLayer({
            "id": "cyclenodes-circles",
            "type": "circle",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenodes",
            "minzoom": 12.5,
            "paint": {
                "circle-stroke-width": 2,
                "circle-stroke-color": nodesColor,
                "circle-radius": 10,
                "circle-color": "#000000",
                "circle-opacity": 0
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_network",
                    "srfn_gent"
                ]
            ]
        });

        map.addLayer({
            "id": "cyclenodes-circles-center",
            "type": "circle",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenodes",
            "minzoom": 12.5,
            "paint": {
                "circle-radius": 10,
                "circle-color": "#fff"
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_network",
                    "srfn_gent"
                ]
            ]
        });

        map.addLayer({
            "id": "cyclenodes-labels",
            "type": "symbol",
            "source": "cyclenetworks-tiles",
            "source-layer": "cyclenodes",
            "minzoom": 12.5,
            "layout": {
                "text-field": "{rcn_ref}",
                "text-size": 13
            },
            "paint": {
                "text-color": nodesColor,
                "text-halo-color": nodesColor,
                "text-halo-width": 0.5,
                "text-halo-blur": 0
            },
            "filter": [
                "all",
                [
                    "==",
                    "cycle_network",
                    "srfn_gent"
                ]
            ]
        });

        var data = new Data();

        map.addSource("school-routes", {
            type: "geojson",
            data: data.schoolRoutes()
        });

        map.addLayer({
            "id": "school-routes",
            "type": "line",
            "source": "school-routes",
            "minzoom": 1,
            "layout": {
                "line-join": "round",
                "line-cap": "round",
                "visibility": "none"
            },
            "paint": {
                "line-color": schoolRoutesColor,
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 6,
                    13, 6,
                    16, 12
                ]
            },
            "filter": ["any",
                [
                    "in",
                    "SRK",
                    1,
                    4,
                    9
                ],
                [
                    "in",
                    "SRK_CODE",
                    1,
                    4,
                    9
                ],
                [
                    "in",
                    "ACCESS",
                    "SAFE"
                ]
            ]
        }, lowestSymbol);

        map.addLayer({
            "id": "school-routes-unsafe",
            "type": "line",
            "source": "school-routes",
            "minzoom": 13.5,
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#FF0000",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 6,
                    12, 10,
                    16, 12
                ]
            },
            "filter": ["any", [
                "in",
                "SRK",
                2
            ],
                [
                    "in",
                    "ACCESS",
                    "OCCASIONALLY_UNSAFE"
                ]
            ]
        }, lowestSymbol);

        map.addLayer({
            "id": "school-routes-semi",
            "type": "line",
            "source": "school-routes",
            "minzoom": 14,
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": schoolRoutesColor,
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 6,
                    12, 10,
                    16, 12
                ],
                "line-dasharray": [1, 1]
            },
            "filter": [
                "in",
                "SRK",
                3
            ]
        }, lowestSymbol);

        map.addLayer(
            {
                'id': 'gipod-con',
                'type': 'raster',
                'source': 'gipod-con',
                "minzoom": 15,
                'paint': {},
                "layout": {
                    "visibility": "none"
                },
            }
        );

        map.addLayer(
            {
                'id': 'gipod-icon',
                'type': 'raster',
                'source': 'gipod-icon',
                "minzoom": 15,
                'paint': {},
                "layout": {
                    "visibility": "none"
                },
            }
        );

        const xhr = new XMLHttpRequest();
        xhr.open("GET", "https://static.anyways.eu/data/bff.geojson");
        xhr.onload = () => {
            if (xhr.status === 200) {
                let response = JSON.parse(xhr.responseText);

                map.addSource("bff", {
                    type: "geojson",
                    data: response
                });

                map.addLayer({
                    "id": "bff",
                    "type": "line",
                    "source": "bff",
                    "minzoom": 11,
                    "layout": {
                        "line-join": "round",
                        "line-cap": "round"
                    },
                    "paint": {
                        "line-color": bffRoutesColor,
                        "line-width": [
                            "interpolate", ["linear"], ["zoom"],
                            10, 1,
                            12, 4,
                            16, 12
                        ],
                        "line-opacity": [
                            "interpolate", ["linear"], ["zoom"],
                            10, 0,
                            12, 0.3,
                            16, 1
                        ]
                    }
                }, lowestSymbol);
            }
            else {
                console.log("getProfiles failed: " + xhr.status);
            }
        };
        xhr.send();

        map.loadImage(PngIcons["bicycle-shop-32"], (e, i) => {
            if (e) throw e;

            map.addImage('bicycle-shop', i);

            map.addLayer({
                "id": "bicycle-shops-back",
                "type": "circle",
                "source": "openmaptiles",
                "source-layer": "poi",
                "minzoom": 15,
                "paint": {
                    "circle-translate": [0, -10],
                    "circle-radius": 14,
                    "circle-color": "#FFF",
                    "circle-opacity": 0.5,
                    "circle-stroke-color": "#FFF",
                    "circle-stroke-width": 5,
                    "circle-stroke-opacity": 0.1,
                },
                "filter": [
                    "all",
                    ["==", "$type", "Point"],
                    ["in", "class", "bicycle"]
                ]
            });

            map.addLayer({
                "id": "bicycle-shops",
                "type": "symbol",
                "source": "openmaptiles",
                "source-layer": "poi",
                "minzoom": 15,
                "paint": {
                    "text-color": "#1da1f2",
                    "text-halo-color": "#FFF",
                    "text-halo-width": 1
                },
                "layout": {
                    "icon-image": "bicycle-shop",
                    "icon-anchor": "bottom",
                    "icon-size": 0.75,
                    "text-field": ["format", ["get", "name"], { "font-scale": 0.8 }],
                    "text-anchor": "top"
                },
                "filter": [
                    "all",
                    ["==", "$type", "Point"],
                    ["in", "class", "bicycle"]
                ]
            });
        });


        map.loadImage(PngIcons["bicycle-parking-16"], (e, i) => {
            if (e) throw e;

            map.addImage('bicycle-parking', i);

            map.addLayer({
                "id": "bicycle-parkings-back",
                "type": "circle",
                "source": "openmaptiles",
                "source-layer": "poi",
                "minzoom": 15,
                "paint": {
                    "circle-radius": 10,
                    "circle-color": "#FFF",
                    "circle-opacity": 0.7
                },
                "filter": [
                    "all",
                    ["==", "$type", "Point"],
                    ["in", "class", "bicycle_parking"]
                ]
            });

            map.addLayer({
                "id": "bicycle-parkings",
                "type": "symbol",
                "source": "openmaptiles",
                "source-layer": "poi",
                "minzoom": 15,
                "layout": {
                    "icon-image": "bicycle-parking",
                    "icon-size": 1
                },
                "filter": [
                    "all",
                    ["==", "$type", "Point"],
                    ["in", "class", "bicycle_parking"]
                ]
            });
        });

        // baseLayerControl.on("toggle", (on) => {
        //     if (on) {
        //         map.setPaintProperty("cycle-node-network-case", "line-color", "#000");
        //         map.setPaintProperty("cyclenodes-circles-center", "circle-color", "#000");
        //         map.setPaintProperty("cycle-highways-case", "line-color", "#000");
        //     } else {
        //         map.setPaintProperty("cycle-node-network-case", "line-color", "#fff");
        //         map.setPaintProperty("cyclenodes-circles-center", "circle-color", "#fff");
        //         map.setPaintProperty("cycle-highways-case", "line-color", "#fff");
        //     }
        // });



        // const layerControl = new LayerControl([{
        //     id: "LN",
        //     name: "Lokaal Netwerk",
        //     layers: ["cycle-node-network", "cyclenodes-circles", "cyclenodes-circles-center", "cyclenodes-labels", "cycle-node-network-case"],
        //     build: (el, c) => {
        //         el.innerHTML = "<div>" +
        //             "<img src=\"" + SvgIcons["network"] + "\" />" +
        //             "</div>" +
        //             "<span>" +
        //             "Lokaal Netwerk" +
        //             "</span>";
        //     },
        //     visible: true,
        //     enabled: true
        // },
        // {
        //     id: "FS",
        //     name: "Fietssnelwegen",
        //     layers: ["cycle-highways-case", "cycle-highways"],
        //     build: (el, c) => {
        //         el.innerHTML = "<div>" +
        //             "<img src=\"" + SvgIcons["highway"] + "\" />" +
        //             "</div>" +
        //             "<span>" +
        //             "Fietssnelwegen" +
        //             "</span>";
        //     },
        //     visible: true,
        //     enabled: true
        // },
        // {
        //     id: "SR",
        //     name: "Schoolroutes",
        //     layers: ["school-routes", "school-routes-unsafe", "school-routes-semi"],
        //     build: (el, c) => {
        //         el.innerHTML = "<div>" +
        //             "<img src=\"" + SvgIcons["school"] + "\" />" +
        //             "</div>" +
        //             "<span>" +
        //             "Schoolroutes" +
        //             "</span>";
        //     },
        //     visible: false,
        //     enabled: false
        // }, {
        //     id: "BF",
        //     name: "Bovenlokaal Functioneel Fietsnetwerk",
        //     layers: ["bff"],
        //     build: (el, c) => {
        //         el.innerHTML = "<div>" +
        //             "<img src=\"" + SvgIcons["network"] + "\" />" +
        //             "</div>" +
        //             "<span>" +
        //             "Functioneel Netwerk" +
        //             "</span>";
        //     },
        //     visible: false,
        //     enabled: true
        // },
        // {
        //     id: "GP",
        //     name: "Wegenwerken",
        //     layers: ["gipod-con", "gipod-icon"],
        //     build: (el, c) => {
        //         el.innerHTML = "<div>" +
        //             "<img src=\"" + SvgIcons["road-works"] + "\" />" +
        //             "</div>" +
        //             "<span>" +
        //             "Wegenwerken" +
        //             "</span>";
        //     },
        //     visible: false,
        //     enabled: true
        // }], urlHasher);
        // map.addControl(layerControl, "bottom-right");
    });

    // rc.on("state", (e: EventBase) => {
    //     const s = e as StateEvent;

    //     urlState.route = s.state;
    //     urlHasher.update(urlState);
    // });

    // rc.on("profiles-loaded", () => {
    //     if (typeof urlState.route !== "undefined") {
    //         rc.setFromState(urlState.route);
    //     }

    //     if (!rc.hasProfileSet()) {
    //         rc.setProfile("bicycle.commute");
    //     }
    // });

    // map.addControl(rc, "top-left");

    // rc.on("legenda", () => legendaControl.show());
};




const xhr = new XMLHttpRequest();
xhr.open("GET", "https://api.maptiler.com/maps/5ee3edf5-df11-4b36-88c9-f660f7afded9/style.json?key=aQMwCJkEBVoDQRMup6IF");
xhr.onload = () => {
    if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);

        response.sources.openmaptiles.url = "https://tiles.anyways.eu/data/v3.json";
        initialize(response);
    }
    else {
        console.log("reverseGeocode failed: " + xhr.status);
    }
};
xhr.send();