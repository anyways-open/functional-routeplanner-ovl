import { Map, LngLatLike } from "mapbox-gl";
import { Profile, RoutingApi } from "@anyways-open/routing-api";
import { LayerControl } from "./components/layer-control/LayerControl";
import { OsmAttributionControl } from "./components/osm-attribution-control/OsmAttributionControl";
import { EventBase, RoutingComponent } from "./components/routing-options/RoutingComponent";
import "./components/routing-options/RoutingComponent.css";
import { UrlHash } from "@anyways-open/url-hash";
import { ProfilesEvent } from "./components/routing-options/events/ProfilesEvent";
import "bootstrap";


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
});

let routingEndpoint = "https://routing.anyways.eu/api/";
if (urlState.host === "staging") {
	console.log("Using staging server");
	routingEndpoint = "https://staging.anyways.eu/routing-api/";
} else if (urlState.host === "debug") {
	console.log("Using localhost server - you might want to disable CORS-rules");
	routingEndpoint = "http://localhost:5000/"
}

const ra = new RoutingApi(routingEndpoint, "Vc32GLKD1wjxyiloWhlcFReFor7aAAOz");
const rc = new RoutingComponent(ra);

const osmAttributionControl = new OsmAttributionControl({
    compact: false,
    customAttribution: "<a href=\"https://www.anyways.eu/cycling-app.html\">ANYWAYS BV</a>"
});   
map.addControl(osmAttributionControl);    

const layerControl = new LayerControl([{
    name: "Node Networks",
    layers: [ "cycle-node-network", "cyclenodes-circles", "cyclenodes-circles-center", "cyclenodes-labels" ] 
},
{
    name: "Cycle Highways",
    layers: [ "cycle-highways" ]
}]);
map.addControl(layerControl, "top-right");

map.on("load", () => {
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

    const nodesColor = "#9999ff";

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
                10, 2,
                13, 4,
                16, 10
            ],
            "line-opacity":[
                "interpolate", ["linear"], ["zoom"],
                12, 1,
                13, 0.4
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
                12, 6,
                16, 25
            ],
            "line-opacity": [
                "interpolate", ["linear"], ["zoom"],
                12, 1,
                13, 0.4
            ],
        },
        "filter": [
            "all",
            [
                "==",
                "cycle_network",
                "cycle_highway"
            ]
        ]
    }, lowestLabel);
    
    map.addLayer({
        "id": "cyclenodes-circles",
        "type": "circle",
        "source": "cyclenetworks-tiles",
        "source-layer": "cyclenodes",
        "minzoom": 11,
        "layout": {
            "visibility": "visible"
        },
        "paint": {
            "circle-stroke-width": 2,
            "circle-stroke-color": nodesColor,
            "circle-radius": 10,
            "circle-color": "#000000",
            "circle-opacity": 0
        }
    });

    map.addLayer({
        "id": "cyclenodes-circles-center",
        "type": "circle",
        "source": "cyclenetworks-tiles",
        "source-layer": "cyclenodes",
        "minzoom": 11,
        "layout": {
            "visibility": "visible"
        },
        "paint": {
            "circle-radius": 10,
            "circle-color": "#FFFFFF"
        }
    });

    map.addLayer({
        "id": "cyclenodes-labels",
        "type": "symbol",
        "source": "cyclenetworks-tiles",
        "source-layer": "cyclenodes",
        "minzoom": 11,
        "layout": {
            "visibility": "visible",
            "text-field": "{rcn_ref}",
            "text-size": 13
        },
        "paint": {
            "text-color": nodesColor,
            "text-halo-color": "#FFFFFF",
            "text-halo-width": 2,
            "text-halo-blur": 0
        }
    });
});

rc.on("location", () => {
    if (!rc.profilesLoaded()) return;

    const locations: string[] = [];
    
    rc.getLocations().forEach(l => {
        locations.push(`${l.lng.toFixed(5)},${l.lat.toFixed(5)}`);
    });
    
    urlState.l = locations;
    UrlHash.write(urlState);
});

rc.on("location-removed", () => {
    if (!rc.profilesLoaded()) return;
    
    const locations: string[] = [];
    
    rc.getLocations().forEach(l => {
        locations.push(`${l.lng.toFixed(5)},${l.lat.toFixed(5)}`);
    });
    
    urlState.l = locations;
    UrlHash.write(urlState);
});

rc.on("profiles-loaded", () => {
    if (typeof urlState.p !== "undefined") {
        if (rc.hasProfile(urlState.p)) { 
            rc.setProfile(urlState.p); 
        } else {
            console.log(`Profile not found, taking default: ${urlState.p}`);
        }
    }
    if (typeof urlState.l !== "undefined") {
        if (!Array.isArray(urlState.l)) {
            const parts = urlState.l.split(",");                
            rc.addLocation([parseFloat(parts[0]), parseFloat(parts[1])]);
        }
        else {
            urlState.l.forEach((l: string) => {
                const parts = l.split(",");                
                rc.addLocation([parseFloat(parts[0]), parseFloat(parts[1])]);
            });
        }
    }
});

rc.on("profile", (c: EventBase) => {
    if (!rc.profilesLoaded()) return;
    
    const e = c as ProfilesEvent;

    urlState.p = e.profiles[0].id;

    UrlHash.write(urlState);
});

map.addControl(rc, "top-left");
