import mapboxgl, { IControl, Map, MapMouseEvent, Marker } from "mapbox-gl";
import { RoutingApi, Profile } from "@anyways-open/routing-api";
import ComponentHtml from "*.html";
import { EventsHub } from "../../libs/events/EventsHub";
import { RoutingComponentEvent } from "./RoutingComponentEvent";

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    readonly routes: any[] = [];
    readonly locations: { marker: Marker, id: number }[] = [];
    readonly events: EventsHub<RoutingComponentEvent> = new EventsHub();
    readonly profiles: { id: string, description: string }[] = [];
    profile: string;

    element: HTMLElement;
    map: Map;

    markerId = 0;

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
        let markerDetails: { marker: Marker, id: number } = null;
        const index = this.locations.length;
        if (index === 0) {
            markerDetails = this._createMarker(l, "marker-origin");
        } else {
            markerDetails = this._createMarker(l, "marker-destination");
        }
        this.locations.push(markerDetails);

        // report on new location.
        this.events.trigger("location", {
            component: this,
            marker: markerDetails
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
            locations.push(l.marker.getLngLat());
        });

        return locations;
    }

    removeLocation(id: number): boolean {
        // get marker index.
        const index = this.locations.findIndex(l => {
            return l.id == id;
        });
        if (index < 0) {
            return false;
        }

        // remove marker from map.
        this.locations[index].marker.remove();

        // remove locations.
        console.log(this.locations);
        this.locations.splice(index, 1);
        console.log(this.locations);

        // remove route with this location as target.
        if (index > 0 && index - 1 < this.routes.length) {
            this.routes[index - 1] = null;
        }
        // remove route with this location as origin.
        if (index < this.routes.length) {
            this.routes[index] = null;
        }
        if (index < this.routes.length) {
            this.routes.splice(index);
        }

        // update map.
        this._updateRoutesLayer();

        // recalculate routes.
        this._calculateRoute();
    }

    getDefaultPosition?: () => string;

    _calculateRoute(): void {
        if (this.locations.length <= 1) return;
        if (!this.profile) return;

        const locations: { lng: number, lat: number }[] = [];
        this.locations.forEach(l => {
            locations.push(l.marker.getLngLat());
        });

        for (let i = 0; i < locations.length - 1; i++) {
            // make sure the array has minimum dimensions.
            while (this.routes.length <= i) {
                this.routes.push(null);
            }
            if (this.routes[i]) continue;

            this.api.getRoute({
                locations: [locations[i], locations[i + 1]],
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
            features: []
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

    private _createMarker(l: mapboxgl.LngLatLike, className: string): { marker: Marker, id: number } {
        const element = document.createElement("div");
        element.className = className ?? "";
        element.innerHTML = ComponentHtml["marker"];

        const marker = new Marker(element, {
            draggable: true,
            offset: [0, -20]
        }).setLngLat(l)
            .addTo(this.map);
        const markerId = this.markerId++;

        // hook drag event.
        marker.on("dragend", () => {
            // get marker index.
            const index = this.locations.findIndex(l => {
                return l.id == markerId;
            });
            if (index < 0) {
                throw new Error(`Marker with id ${markerId} not found.`)
            }

            // recalculate route with this location as target.
            if (index > 0 && index - 1 < this.routes.length) {
                this.routes[index - 1] = null;
            }
            // recalculate route with this location as origin.
            if (index < this.routes.length) {
                this.routes[index] = null;
            }

            // trigger event.
            this.events.trigger("location", {
                component: this,
                marker: {
                    marker: marker,
                    id: markerId
                }
            });

            // recalculate routes.
            this._calculateRoute();
        });

        // add click event.
        element.addEventListener("click", (e) => {
            this.removeLocation(markerId);
            e.stopPropagation();
        }, true);

        return {
            marker: marker,
            id: markerId
        };
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