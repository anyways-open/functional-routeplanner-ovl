import mapboxgl, { IControl, Map, MapMouseEvent, Marker } from 'mapbox-gl';
import { RoutingApi } from '../../apis/routing-api/RoutingApi';
import ComponentHtml from '*.html';
import * as turf from '@turf/turf';
import { Profile } from '../../apis/routing-api/Profile';
import { EventsHub } from '../../libs/events/EventsHub';
import { RoutingComponentEvent } from './RoutingComponentEvent';

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    element: HTMLElement;
    map: Map;
    profiles: { id: string, description: string }[];

    origin: Marker;
    destination: Marker;

    profile: string;

    events: EventsHub<RoutingComponentEvent> = new EventsHub();

    constructor(api: RoutingApi) {
        this.api = api;
    }

    on(name: string | string[], callback: (args: RoutingComponentEvent) => void) {
        this.events.on(name, callback);
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        // hook up events.
        var me = this;
        this.map.on("load", function (e) { me._mapLoad(e); });
        this.map.on("click", function (e) { me._mapClick(e); });

        return this.element;
    }

    setProfile(profile: string) {
        this.profile = profile;

        var select = document.getElementById("profiles");
        if (select) {
            select.value = this.profile;
        }
    }

    setOrigin(l: mapboxgl.LngLatLike) {
        var me = this;

        if (this.origin) {
            this.origin.setLngLat(l);
        } else {
            const element = document.createElement("div");
            element.className = "marker-origin";
            element.innerHTML = ComponentHtml["marker"];

            var marker = new Marker(element, {
                draggable: true,
                offset: [0, -20]
            }).setLngLat(l)
                .addTo(this.map);

            this.events.trigger("origin", {
                component: this,
                marker: marker
            });

            marker.on("dragend", () => {
                this.events.trigger("origin", {
                    component: this,
                    marker: marker
                });

                me._calculateRoute();
            });

            this.origin = marker;
        }

        if (this.destination) {
            this._calculateRoute();
        }
    }

    setDestination(l: mapboxgl.LngLatLike) {
        var me = this;

        if (this.destination) {
            this.destination.setLngLat(l);
        } else {
            const element = document.createElement("div");
            element.className = "marker-destination";
            element.innerHTML = ComponentHtml["marker"];

            var marker = new Marker(element, {
                draggable: true,
                offset: [0, -20]
            }).setLngLat(l)
                .addTo(this.map);

            this.events.trigger("destination", {
                component: this,
                marker: marker
            });

            marker.on("dragend", () => {
                this.events.trigger("destination", {
                    component: this,
                    marker: marker
                });

                me._calculateRoute();
            });

            this.destination = marker;
        }

        this._calculateRoute();
    }

    onRemove(map: mapboxgl.Map) {

    }

    getDefaultPosition?: () => string;

    _calculateRoute() {
        if (this.origin && this.destination) { } else { return; }
        if (!this.profile) return;

        var locations: { lng: number, lat: number }[] = [];
        locations.push(this.origin.getLngLat());
        locations.push(this.destination.getLngLat());

        this.api.getRoute({
            locations: locations,
            profile: this.profile
        }, e => {
            this.map.getSource("route").setData(e);

            var distance = document.getElementById("distance");
            e.features.forEach(f => {
                if (f && f.properties) {
                    if (f.properties.distance) {
                        distance.innerHTML = "" + f.properties.distance + "m";
                    }
                }
            });

            this.events.trigger("calculated", {
                component: this,
                route: e
            });
        });
    }

    _mapLoad(e: any) {
        // trigger load profiles
        this.api.getProfiles(profiles => {
            this._createUI(profiles);
        });

        // get lowest label and road.
        var style = this.map.getStyle();
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

        // add layers.
        this.map.addSource("route", {
            type: "geojson",
            data: {
                type: 'FeatureCollection',
                features: [
                ]
            }
        });
        this.map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#000',
                "line-width": [
                    'interpolate', ['linear'], ['zoom'],
                    10, 8,
                    14, 16,
                    16, 30
                ],
                'line-opacity': [
                    'interpolate', ['linear'], ['zoom'],
                    12, 1,
                    13, 0.4
                ]
            }
        }, lowestLabel);
    }

    _mapClick(e: MapMouseEvent) {
        var me = this;

        if (this.origin) {
            this.setDestination(e.lngLat);

            this._calculateRoute();
        } else {
            this.setOrigin(e.lngLat);
        }
    }

    _createUI(profiles: Profile[]) {
        var me = this;

        var componentHtml = ComponentHtml["index"];
        this.element.innerHTML = componentHtml;

        // add profiles as options.
        var select = document.getElementById("profiles");
        for (var p in profiles) {
            var profile = profiles[p];
            var option = document.createElement("option");

            var profileName = profile.type;
            if (profile.name) {
                profileName = profile.type + '.' + profile.name;
            }
            
            option.value = profileName
            option.innerHTML = profileName;
            select.appendChild(option);
        }

        // set the first profile as the default or select the one that is there.
        if (this.profile) {
            select.value = this.profile;
        } else {
            this.profile = profiles[0].type;
            if (profiles[0].name) {
                this.profile = profiles[0].type + '.' + profiles[0].name;
            }

            this.events.trigger("profile", {
                component: this,
                profile: this.profile
            });
        }

        // hook up the change event
        select.addEventListener("change", () => {
            select = document.getElementById("profiles");

            me.profile = select.value;

            this.events.trigger("profile", {
                component: me,
                profile: me.profile
            });

            me._calculateRoute();
        });
    }
}