import mapboxgl, { GeoJSONSource, IControl, Map, MapMouseEvent, Marker } from "mapbox-gl";
import { RoutingApi, Profile } from "@anyways-open/routing-api";
import ComponentHtml from "*.html";
import { EventsHub } from "./EventsHub";
import * as turf from "@turf/turf";
import { NearestPointOnLine } from "@turf/nearest-point-on-line";
import { LocationEvent } from "./events/LocationEvent";
import { ProfilesEvent } from "./events/ProfilesEvent";
import { RouteEvent } from "./events/RouteEvent";

export type EventBase = LocationEvent | ProfilesEvent | RouteEvent

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    readonly options: {
        defaultUI: boolean
    };
    readonly routes: unknown[] = [];
    readonly locations: { marker: Marker, id: number }[] = [];
    readonly events: EventsHub<EventBase> = new EventsHub();

    private profiles: Profile[] = [];
    private profile?: Profile;
    private element?: HTMLElement;
    private map: Map;
    private snapPoint?: NearestPointOnLine;
    private markerId = 0;

    constructor(api: RoutingApi, options?: {
        defaultUI?: boolean
    }) {
        this.api = api;
        this.options = {
            defaultUI: options?.defaultUI ?? true
        };
    }

    /**
     * Registers an event handler for the given event.
     * 
     * @param name The name.
     * @param callback The callback.
     */
    on(name: "location" | "location-removed" | "profiles-loaded" | "profile" | "route",
        callback: (args: EventBase) => void): void {
        this.events.on(name, callback);
    }

    /**
     * IControl implementation: Called when the control is added to the map.
     * 
     * @param map The map.
     */
    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        // hook up events.
        this.map.on("load", () => this._mapLoad());
        this.map.on("click", (e) => this._mapClick(e));
        this.map.on("mousemove", (e) => this._mapMouseMove(e));
        this.map.on("mousedown", () => this._mapMouseDown());
        this.map.on("mouseup", (e) => this._mapMouseUp(e));

        return this.element;
    }

    /**
     * IControl implementation: Called when the control is removed from the map.
     * 
     * @param map The map.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
    onRemove(map: mapboxgl.Map): void {

    }

    /**: { properties: { distance: string; }; }
     * IControl implementation: Gets the default position.
     */
    getDefaultPosition?: () => string;

    /**
     * Sets the profile.
     * 
     * @param profile The profile id.
     */
    setProfile(id: string): void {
        // get profile.
        this.profile = this._getProfileFor(id);

        // reset routes and recalculate.
        for (let i = 0; i < this.routes.length; i++) {
            this.routes[i] = null;
        }
        this._calculateRoute();
    }

    /**
     * Returns true if the profile is supported.
     * 
     * @param id The profile id.
     */
    hasProfile(id: string): boolean {
        const profile = this.profiles.find(x => x.id == id);
        if (typeof (profile) === "undefined") {
            return false;
        }
        return true;
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
            location: markerDetails.marker.getLngLat(),
            id: markerDetails.id
        });

        // calculate if locations.
        if (this.locations.length > 1) {
            this._calculateRoute();
        }
    }

    /**
     * Inserts a new location at the given index.
     * 
     * @param i The index to insert at.
     * @param l The location to insert.
     */
    insertLocation(i: number, l: mapboxgl.LngLatLike): void {
        // add markers for each location.
        let markerDetails: { marker: Marker, id: number } = null;
        const index = i;
        if (index === 0) {
            markerDetails = this._createMarker(l, "marker-origin");
        } else {
            markerDetails = this._createMarker(l, "marker-destination");
        }
        this.locations.splice(index, 0, markerDetails);
        if (index > 0) this.routes[index - 1] = undefined;
        this.routes.splice(index, 0, undefined);

        // report on new location.
        this.events.trigger("location", {
            component: this,
            location: markerDetails.marker.getLngLat(),
            id: markerDetails.id
        });

        // calculate if locations.
        if (this.locations.length > 1) {
            this._calculateRoute();
        }
    }

    /**
     * Gets all locations.
     */
    getLocations(): { lng: number, lat: number, id: number }[] {
        const locations: { lng: number, lat: number, id: number }[] = [];
        this.locations.forEach(l => {
            const lngLat = l.marker.getLngLat();
            locations.push({ lng: lngLat.lng, lat: lngLat.lat, id: l.id });
        });

        return locations;
    }

    /**
     * Remove the location with the given id.
     * 
     * @param id The id of the location.
     */
    removeLocation(id: number): boolean {
        // get marker index.
        const index = this.locations.findIndex(l => {
            return l.id == id;
        });
        if (index < 0) {
            return false;
        }

        const removed = this.locations[index];
        const removedLocation = removed.marker.getLngLat();

        // remove marker from map.
        this.locations[index].marker.remove();

        // remove locations.
        this.locations.splice(index, 1);

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

        // report on removed location.
        this.events.trigger("location-removed", {
            component: this,
            id: removed.id,
            location: removedLocation
        });
    }
    
    private _getProfileFor(id: string): Profile {
        const profile = this.profiles.find(x => x.id == id);
        if (typeof (profile) === "undefined") {
            throw Error(`Profile not in the profiles list: ${ id }`);
        }

        return profile;
    }

    private _calculateRoute(): void {
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
                profile: this.profile.id
            }, e => {
                this.routes[i] = e;
                this._updateRoutesLayer();

                this.events.trigger("route", {
                    component: this,
                    index: i,
                    route: e
                });
            });
        }
    }

    private _updateRoutesLayer(): void {
        const routesFeatures: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
            type: "FeatureCollection",
            features: []
        };

        let totalDistance = 0;
        for (let i = 0; i < this.routes.length; i++) {
            const r = this.routes[i] as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

            if (r && r.features) {
                let routeDistance = 0;
                r.features.forEach((f) => {
                    if (f && f.properties) {
                        if (f.properties.distance) {
                            routeDistance = parseFloat(f.properties.distance);
                        }
                        f.properties["_route-index"] = i;
                    }
                });
                totalDistance += routeDistance;

                routesFeatures.features =
                    routesFeatures.features.concat(r.features);
            }
        }

        const distance = document.getElementById("distance");
        if (distance) {
            distance.innerHTML = "" + totalDistance.toFixed(0) + "m";
        }

        const source: GeoJSONSource = this.map.getSource("route") as GeoJSONSource;
        source.setData(routesFeatures);
    }

    private _mapLoad(): void {
        // trigger load profiles
        this.api.getProfiles(profiles => {
            this.profiles = profiles;

            if (this.options.defaultUI) this._createDefaultUI(profiles);

            this.events.trigger("profiles-loaded", {
                profiles: profiles
            });
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
        const routeColor = "#000";
        this.map.addLayer({
            "id": "route",
            "type": "line",
            "source": "route",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": routeColor,
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 8,
                    14, 16
                ],
                "line-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 1,
                    13, 0.6
                ]
            }
        }, lowestLabel);

        this.map.addSource("route-snap", {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [
                ]
            }
        });
        this.map.addLayer({
            "id": "route-snap",
            "type": "circle",
            "source": "route-snap",
            "paint": {
                "circle-color": "rgba(255, 255, 255, 1)",
                "circle-stroke-color": routeColor,
                "circle-stroke-width": 5,
                "circle-stroke-opacity": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 1,
                    13, 0.6
                ],
                "circle-radius": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 6,
                    14, 8
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
                id: markerId,
                location: marker.getLngLat()
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
        if (typeof (this.snapPoint) !== "undefined") {
            return;
        }
        this.addLocation(e.lngLat);
    }

    private _dragging = false;

    private _mapMouseMove(e: MapMouseEvent) {
        const routeLayer = this.map.getLayer("route");
        if (typeof (routeLayer) === "undefined") return;

        const snapSource: GeoJSONSource = this.map.getSource("route-snap") as GeoJSONSource;
        if (typeof (snapSource) === "undefined") return;

        if (!this._dragging) {
            const boxSize = 10;

            let tooCloseToMarker = false;
            for (let i = 0; i < this.locations.length; i++) {
                const l = this.locations[i];
                if (typeof (l) === "undefined") continue;

                const pl = this.map.project(l.marker.getLngLat());
                if (Math.abs(e.point.x - pl.x) < boxSize ||
                    Math.abs(e.point.x - pl.x) < boxSize) {
                    tooCloseToMarker = true
                }
            }

            let snapped: NearestPointOnLine;
            if (!tooCloseToMarker) {
                const features = this.map.queryRenderedFeatures(
                    [[e.point.x - boxSize, e.point.y - boxSize],
                    [e.point.x + boxSize, e.point.y + boxSize]], {
                    layers: ["route"],
                });

                features.forEach(f => {
                    if (f.geometry.type == "LineString") {
                        if (f.properties && typeof (f.properties["_route-index"]) != "undefined") {
                            const s = turf.nearestPointOnLine(f.geometry, [e.lngLat.lng, e.lngLat.lat]);
                            if (typeof (s) === "undefined") return;
                            if (s.properties.dist) {
                                if (typeof (snapped) === "undefined") {
                                    snapped = s;
                                    snapped.properties["_route-index"] = f.properties["_route-index"];
                                } else {
                                    if (snapped.properties.dist) return;
                                    if (s.properties.dist < snapped.properties.dist) {
                                        snapped = s;
                                        snapped.properties["_route-index"] = f.properties["_route-index"];
                                    }
                                }
                            }
                        }
                    }
                });
            }

            if (typeof (snapped) === "undefined") {
                const empty: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
                    type: "FeatureCollection",
                    features: []
                };
                snapSource.setData(empty);
                this.snapPoint = undefined;
                this.map.dragPan.enable();
                return;
            }
            snapSource.setData(snapped);
            this.snapPoint = snapped;

            this.map.dragPan.disable();
        } else {
            if (typeof (this.snapPoint) === "undefined") {
                return;
            }
            this.snapPoint.geometry = {
                type: "Point",
                coordinates: [e.lngLat.lng, e.lngLat.lat]
            }

            snapSource.setData(this.snapPoint);
        }
    }

    private _mapMouseDown() {
        this._dragging = false;
        if (typeof (this.snapPoint) !== "undefined") {
            this._dragging = true;
        }
    }

    private _mapMouseUp(e: MapMouseEvent) {
        if (!this._dragging) return;

        if (typeof (this.snapPoint) === "undefined") {
            throw Error("Snappoint not set but dragging.");
        }

        const routeIndex: number = this.snapPoint.properties["_route-index"];
        this.insertLocation(routeIndex + 1, e.lngLat);

        const snapSource: GeoJSONSource = this.map.getSource("route-snap") as GeoJSONSource;
        const empty: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
            type: "FeatureCollection",
            features: []
        };
        snapSource.setData(empty);
        this.snapPoint = undefined;

        this._dragging = false;
        this.map.dragPan.enable();
        return;
    }

    private _createDefaultUI(profiles: Profile[]) {

        const componentHtml = ComponentHtml["index"];
        this.element.innerHTML = componentHtml;

        // add profiles as options.
        let select = document.getElementById("profiles") as HTMLSelectElement;
        for (const p in profiles) {
            const profile = profiles[p];
            const option = document.createElement("option");

            let profileName = profile.type;
            if (profile.name) {
                profileName = profile.id;
            }

            option.value = profileName
            option.innerHTML = profileName;
            select.appendChild(option);
        }

        // set the first profile as the default or select the one that is there.
        if (this.profile) {
            select.value = this.profile.id;
        } else {
            this.profile = profiles[0];

            this.events.trigger("profile", {
                component: this,
                profiles: [ this.profile ]
            });
        }

        // hook up the change event
        select.addEventListener("change", () => {
            select = document.getElementById("profiles") as HTMLSelectElement;

            // set profile.
            this.profile = this._getProfileFor(select.value);

            // trigger event.
            this.events.trigger("profile", {
                component: this,
                profiles: [this.profile]
            });

            this._calculateRoute();
        });
    }
}