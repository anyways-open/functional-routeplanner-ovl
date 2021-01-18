import { Map, LngLatLike } from 'mapbox-gl';
import { RoutingApi } from './apis/routing-api/RoutingApi';
import { LayerControl } from './components/layer-control/LayerControl';
import { OsmAttributionControl } from './components/osm-attribution-control/OsmAttributionControl';
import { RoutingComponent } from './components/routing-options/RoutingComponent';
import "./components/routing-options/RoutingComponent.css";
import { UrlHash } from './components/url-hash/UrlHash';

const urlState = UrlHash.read();

// parse the map state.
const mapState: {
    center: LngLatLike
    zoom: number
} = {
    center: [4.4019, 51.2260],
    zoom: 11.02
}
if (typeof urlState.map !== "undefined") {
    const parts = urlState.map.split("/");

    if (parts.length === 3) {
        mapState.center = [parseFloat(parts[1]), parseFloat(parts[2])];
        mapState.zoom = parseInt(parts[0], 10);
    }
}

const map = new Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/basic/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    center: mapState.center,
    zoom: mapState.zoom,
    preserveDrawingBuffer: true,
    attributionControl: false,
});

let routingEndpoint = "https://routing.anyways.eu/api/";
if(urlState.host === "staging"){
	console.log("Using staging server");
	routingEndpoint = "https://staging.anyways.eu/routing-api/";
}else if(urlState.host === "debug"){
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
},
{
    name: "Functional Network Antwerp",
    layers: [ "cycle-network-antwerp" ]
},
{
    name: "Network Genk",
    layers: [ "cycle-network-genk" ]
},
{
    name: "Network Brussels Region",
    layers: [ "cycle-network-brussels" ]
}]);
map.addControl(layerControl, 'top-left');

map.on("load", e => {
    if (typeof urlState.p !== "undefined") {
        rc.setProfile(urlState.p);
    }
    if (typeof urlState.o !== "undefined") {
        const parts = urlState.o.split(",");

        if (parts.length === 2) {
            rc.setOrigin([parseFloat(parts[0]), parseFloat(parts[1])]);
        }
    }
    if (typeof urlState.d !== "undefined") {
        const parts = urlState.d.split(",");

        if (parts.length === 2) {
            rc.setDestination([parseFloat(parts[0]), parseFloat(parts[1])]);
        }
    }

    function updateMapUrlState() {
        const center = map.getCenter();
        urlState.map = `${map.getZoom().toFixed(2)}/${center.lng.toFixed(5)}/${center.lat.toFixed(5)}`;

        UrlHash.write(urlState);
    }
    if (typeof urlState.map === "undefined") {
        updateMapUrlState();
    }

    map.on("moveend", e => {
        updateMapUrlState();
    });

    // get lowest label and road.
    var style = map.getStyle();
    var lowestRoad = undefined;
    var lowestLabel = undefined;
    var lowestSymbol = undefined;
    for (var l = 0; l < style.layers.length; l++) {
        var layer = style.layers[l];

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

    map.addSource('cyclenetworks-tiles', {
        type: 'vector',
        url: 'https://api.anyways.eu/tiles/cyclenetworks/mvt.json'
    });

    var nodesColor = "#9999ff";

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
                'interpolate', ['linear'], ['zoom'],
                10, 2,
                13, 4,
                16, 10
            ],
            "line-opacity":[
                'interpolate', ['linear'], ['zoom'],
                12, 1,
                13, 0.4
            ]
        },
        "filter": [
            "all",
            [
                "==",
                "network:type",
                "node_network"
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
                'interpolate', ['linear'], ['zoom'],
                10, 3,
                12, 6,
                16, 25
            ],
            "line-opacity": [
                'interpolate', ['linear'], ['zoom'],
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
        "id": "cycle-network-antwerp",
        "type": "line",
        "source": "cyclenetworks-tiles",
        "source-layer": "cyclenetwork",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#00cc00",
            "line-width": [
                'interpolate', ['linear'], ['zoom'],
                10, 3,
                12, 6,
                16, 25
            ],
            "line-opacity": [
                'interpolate', ['linear'], ['zoom'],
                12, 1,
                13, 0.4
            ],
        },
        "filter": [
            "all",
            [
                 "==",
                 "operator",
                 "Stad Antwerpen"
            ]
        ]
    }, lowestLabel);

    map.addLayer({
        "id": "cycle-network-genk",
        "type": "line",
        "source": "cyclenetworks-tiles",
        "source-layer": "cyclenetwork",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": ['get', 'colour'],
            "line-width": [
                'interpolate', ['linear'], ['zoom'],
                10, 2,
                13, 4,
                16, 10
            ],
            "line-opacity":[
                'interpolate', ['linear'], ['zoom'],
                12, 1,
                13, 0.4
            ]
        },
        "filter": [
            "all",
            [
                "==",
                "$type",
                "LineString"
            ],
            [
                "all",
                [
                    "==",
                    "operator",
                    "Stad Genk"
                ]
            ]
        ]
    }, lowestLabel);

    map.addLayer({
        "id": "cycle-network-brussels",
        "type": "line",
        "source": "cyclenetworks-tiles",
        "source-layer": "cyclenetwork",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": ['get', 'colour'],
            "line-width": [
                'interpolate', ['linear'], ['zoom'],
                10, 2,
                13, 4,
                16, 10
            ],
            "line-opacity":[
                'interpolate', ['linear'], ['zoom'],
                12, 1,
                13, 0.4
            ]
        },
        "filter": [
            "all",
            [
                "==",
                "operator",
                "Brussels Mobility"
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

rc.on('origin', c => {
    urlState.o = `${c.marker.getLngLat().lng.toFixed(5)},${c.marker.getLngLat().lat.toFixed(5)}`;

    UrlHash.write(urlState);
});

rc.on('destination', c => {
    urlState.d = `${c.marker.getLngLat().lng.toFixed(5)},${c.marker.getLngLat().lat.toFixed(5)}`;

    UrlHash.write(urlState);
});

rc.on('profile', c => {
    urlState.p = c.profile;

    UrlHash.write(urlState);
});

map.addControl(rc);
