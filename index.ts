import { Map, LngLatLike, GeolocateControl, NavigationControl } from "mapbox-gl";
import { Profile, RoutingApi } from "@anyways-open/routing-api";
import { LayerControl } from "./components/layer-control/LayerControl";
import { OsmAttributionControl } from "./components/osm-attribution-control/OsmAttributionControl";
import { EventBase, RoutingComponent } from "./components/routing-options/RoutingComponent";
import "./components/routing-options/RoutingComponent.css";
import { UrlHash } from "@anyways-open/url-hash";
import { ProfilesEvent } from "./components/routing-options/events/ProfilesEvent";
import "bootstrap";
import { StateEvent } from "./components/routing-options/events/StateEvent";
import { GeocodingControl } from "./components/geocoder/GeocoderControl";
import { BaseLayerControl } from "./components/baselayer-control/BaseLayerControl";
import BaseLayerImages from "./assets/img/base-layers/*.png";
import Icons from "./assets/img/icons/*.*";


const urlState = UrlHash.read();

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

const map = new Map({
    container: "map",
    style: "https://api.maptiler.com/maps/basic/style.json?key=aQMwCJkEBVoDQRMup6IF",
    center: mapState.center,
    zoom: mapState.zoom,
    preserveDrawingBuffer: true,
    attributionControl: false,
    maxZoom: 18
});

// let routingEndpoint = "https://staging.anyways.eu/routing-api2/";
let routingEndpoint = "https://routing.anyways.eu/api/";
if (urlState.host === "staging") {
	console.log("Using staging server");
	routingEndpoint = "https://staging.anyways.eu/routing-api/";
} else if (urlState.host === "debug") {
	console.log("Using localhost server - you might want to disable CORS-rules");
	routingEndpoint = "http://localhost:5000/"
}

const ra = new RoutingApi(routingEndpoint, "Vc32GLKD1wjxyiloWhlcFReFor7aAAOz");
const rc = new RoutingComponent(ra, {
    geocoder: new GeocodingControl("OZUCIh4RNx38vXF8gF4H"),
    profiles: [ {
        id: "bicycle",
        description: "Functioneel fietsen",
        image: Icons["bicycle"].svg
    },{
        id: "bicycle.client_network",
        description: "Fietsnetwerken",
        image: Icons["network"].svg
    } ]
});

const osmAttributionControl = new OsmAttributionControl({
    compact: false,
    customAttribution: "<a href=\"https://www.anyways.eu/cycling-app.html\">ANYWAYS BV</a>"
});   
map.addControl(osmAttributionControl);    

const nav = new NavigationControl({
    visualizePitch: true
});
map.addControl(nav, "top-right");

const geolocationControl = new GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    showAccuracyCircle: true,
    showUserLocation: true,
    trackUserLocation: false
})
map.addControl(geolocationControl, "top-right");

geolocationControl.on("geolocate", function(data: { coords: { latitude: any; longitude: any; }; }) {
    rc.reportCurrentLocation({
        lat: data.coords.latitude,
        lng: data.coords.longitude
    });
});

const baseLayerControl = new BaseLayerControl({
    source: "aiv",
    images: {
        map: BaseLayerImages["map"],
        imagery: BaseLayerImages["sattelite"],
    }
});
map.addControl(baseLayerControl, "bottom-right");

map.on("load", () => {
    // geolocationControl.trigger();

    map.addSource("aiv", {
        "type": "raster",
        "tiles": ["https://tile.informatievlaanderen.be/ws/raadpleegdiensten/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=omwrgbmrvl&STYLE=&FORMAT=image/png&tileMatrixSet=GoogleMapsVL&tileMatrix={z}&tileRow={y}&tileCol={x}"],
        "tileSize": 256,
        "attribution": "AIV"
    });
    
    function updateMapUrlState() {
        const center = map.getCenter();
        urlState.map = `${map.getZoom().toFixed(2)}/${center.lng.toFixed(5)}/${center.lat.toFixed(5)}`;

        UrlHash.write(urlState);
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
                "cycle_network",
                "cycle_highway"
            ],
            [
                "!=",
                "state",
                "proposed"
            ]
        ]
    }, lowestLabel);

    const nodesColor = "#ccad00";

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
                "cycle_network",
                "cycle_highway"
            ],
            [
                "!=",
                "state",
                "proposed"
            ]
        ]
    }, lowestLabel);

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

    baseLayerControl.on("toggle", (on) => {
        if (on) {
            map.setPaintProperty("cycle-node-network-case", "line-color", "#000");
            map.setPaintProperty("cyclenodes-circles-center", "circle-color", "#000");
            map.setPaintProperty("cycle-highways-case", "line-color", "#000");
        } else {
            map.setPaintProperty("cycle-node-network-case", "line-color", "#fff");
            map.setPaintProperty("cyclenodes-circles-center", "circle-color", "#fff");
            map.setPaintProperty("cycle-highways-case", "line-color", "#fff");
        }
    });
});

rc.on("state", (e: EventBase) => {
    const s = e as StateEvent;

    urlState.route = s.state;
    UrlHash.write(urlState);
});

rc.on("profiles-loaded", () => {
    if (typeof urlState.route !== "undefined") {
        rc.setFromState(urlState.route);
    }

    if (!rc.hasProfileSet()) {
        rc.setProfile("bicycle.commute");
    }
});

map.addControl(rc, "top-left");

const layerControl = new LayerControl([{
    name: "Node Networks",
    layers: [ "cycle-node-network", "cyclenodes-circles", "cyclenodes-circles-center", "cyclenodes-labels", "cycle-node-network-case" ],
    build: (el, c) => {
        el.innerHTML = "<span>" +
        "<img src=\"" + Icons["network"].svg + "\" />" +
        "</span>" +
      "<span>" +
            "Fietsknoopunten Gent" +
        "</span>";
    },
    visible: true
},
{
    name: "Cycle Highways",
    layers: [ "cycle-highways-case", "cycle-highways" ],
    build: (el, c) => {
        el.innerHTML = "<span>" +
        "<img src=\"" + Icons["highway"].svg + "\" />" +
        "</span>" +
      "<span>" +
            "Fietsnelwegen" +
        "</span>";
    },
    visible: true
}]);
map.addControl(layerControl, "bottom-right");
