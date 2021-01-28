import mapboxgl, { IControl, Map, MapMouseEvent, Marker } from "mapbox-gl";
import { RoutingApi, Profile } from "@anyways-open/routing-api";
import ComponentHtml from "*.html";
import { EventsHub } from "../../libs/events/EventsHub";
import { RoutingComponentEvent } from "./RoutingComponentEvent";

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    element: HTMLElement;
    map: Map;
    profiles: { id: string, description: string }[];

    locations: Marker[] = [];
    routes: any[] = [];

    profile: string;

    events: EventsHub<RoutingComponentEvent> = new EventsHub();

    constructor(api: RoutingApi) {
        this.api = api;
    }

    on(name: string | string[], callback: (args: RoutingComponentEvent) => void): void {
        this.events.on(name, callback);
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        // hook up events.
        this.map.on("load", () => this._mapLoad());
        this.map.on("click", (e) => this._mapClick(e));

        return this.element;
    }

    setProfile(profile: string): void {
        this.profile = profile;

        const select = document.getElementById("profiles");
        if (select) {
            select.value = this.profile;
        }

        for (let i = 0; i < this.routes.length; i++) { 
            this.routes[i] = null;
        }
        this._calculateRoute();
    }

    /**
     * Adds a new location.
     * 
     * First location is taken as origin, next as extra sequential destinations.
     * @param l The location.
     */
    addLocation(l: mapboxgl.LngLatLike): void {
        // add markers for each location.
        let marker: Marker = null;
        const index = this.locations.length;
        if (index === 0) {
            marker = this._createMarker(l, "marker-origin", 0);
        } else {
            marker = this._createMarker(l, "marker-destination", index);
        }
        this.locations.push(marker);

        // report on new location.
        this.events.trigger("location", {
            component: this,
            marker: {
                marker: marker,
                index: index
            }
        });

        // calculate if locations.
        if (this.locations.length > 1) {
            this._calculateRoute();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
    onRemove(map: mapboxgl.Map): void {

    }

    getLocations(): { lng: number, lat: number }[] {
        const locations: { lng: number, lat: number }[] = [];
        this.locations.forEach(l => {
            locations.push(l.getLngLat());
        });

        return locations;
    }

    getDefaultPosition?: () => string;

    _calculateRoute(): void {
        if (this.locations.length <= 1) return;
        if (!this.profile) return;

        const locations: { lng: number, lat: number }[] = [];
        this.locations.forEach(l => {
            locations.push(l.getLngLat());
        });

        for (let i = 0; i < locations.length - 1; i++) {
            // make sure the array has minimum dimensions.
            while (this.routes.length <= i) {
                this.routes.push(null);
            }
            if (this.routes[i]) continue;

            this.api.getRoute({
                locations: [ locations[i], locations[i + 1]],
                profile: this.profile
            }, e => {
                this.routes[i] = e;
                this._updateRoutesLayer();
    
                this.events.trigger("calculated", {
                    component: this,
                    route: {
                        route: e,
                        index: i
                    }
                });
            });
        }
    }

    _updateRoutesLayer(): void {
        const routesFeatures = {
            type: "FeatureCollection",
            features: [ ]
        };

        let totalDistance = 0;
        this.routes.forEach(r => {
            if (r && r.features) {    
                let routeDistance = 0;
                r.features.forEach((f: { properties: { distance: string; }; }) => {
                    if (f && f.properties) {
                        if (f.properties.distance) {
                            routeDistance = parseFloat(f.properties.distance);
                        }
                    }
                });
                totalDistance += routeDistance;

                routesFeatures.features = 
                    routesFeatures.features.concat(r.features);
            }
        });

        const distance = document.getElementById("distance");
        if (distance) {
            distance.innerHTML = "" + totalDistance.toFixed(0) + "m";
        }

        this.map.getSource("route").setData(routesFeatures);
    }

    _mapLoad(): void {
        // trigger load profiles
        this.api.getProfiles(profiles => {
            this._createUI(profiles);
        });

        // get lowest label and road.
        const style = this.map.getStyle();
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

        // add layers.
        this.map.addSource("route", {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [
                ]
            }
        });
        this.map.addLayer({
            "id": "route",
            "type": "line",
            "source": "route",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#000",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 8,
                    14, 16,
                    16, 30
                ],
                "line-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 1,
                    13, 0.4
                ]
            }
        }, lowestLabel);
    }

    private _createMarker(l: mapboxgl.LngLatLike, className: string, index: number) : Marker {
        const element = document.createElement("div");
        element.className = className ?? "";
        element.innerHTML = ComponentHtml["marker"];

        const marker = new Marker(element, {
            draggable: true,
            offset: [0, -20]
        }).setLngLat(l)
            .addTo(this.map);

        marker.on("dragend", () => {
            this.events.trigger("location", {
                component: this,
                marker: {
                    marker: marker,
                    index: index
                }
            });

            // recalculate route with this location as target.
            if (index > 0 && index - 1 < this.routes.length) {
                this.routes[index - 1] = null;
            }
            // recalculate route with this location as origin.
            if (index < this.routes.length) {
                this.routes[index] = null;
            }
            this._calculateRoute();
        });

        return marker;
    }

    private _mapClick(e: MapMouseEvent) {
        this.addLocation(e.lngLat);
    }

    private _createUI(profiles: Profile[]) {

        const componentHtml = ComponentHtml["index"];
        this.element.innerHTML = componentHtml;

        // add profiles as options.
        let select = document.getElementById("profiles");
        for (const p in profiles) {
            const profile = profiles[p];
            const option = document.createElement("option");

            let profileName = profile.type;
            if (profile.name) {
                profileName = profile.type + "." + profile.name;
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
                this.profile = profiles[0].type + "." + profiles[0].name;
            }

            this.events.trigger("profile", {
                component: this,
                profile: this.profile
            });
        }

        // hook up the change event
        select.addEventListener("change", () => {
            select = document.getElementById("profiles");

            this.profile = select.value;

            this.events.trigger("profile", {
                component: this,
                profile: this.profile
            });

            for (let i = 0; i < this.routes.length; i++) { 
                this.routes[i] = null;
            }
            this._calculateRoute();
        });
    }
}