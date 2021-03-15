import mapboxgl, { GeoJSONSource, IControl, LngLat, Map, MapMouseEvent, Marker, PointLike } from "mapbox-gl";
import { RoutingApi, Profile } from "@anyways-open/routing-api";
import ComponentHtml from "*.html";
import { EventsHub } from "./EventsHub";
import * as turf from "@turf/turf";
import { NearestPointOnLine } from "@turf/nearest-point-on-line";
import { LocationEvent } from "./events/LocationEvent";
import { ProfilesEvent } from "./events/ProfilesEvent";
import { RouteEvent } from "./events/RouteEvent";
import { RoutingLocation } from "./RoutingLocation";
import { StateEvent } from "./events/StateEvent";
import { UI } from "./UI";
import { GeocodingControl } from "../geocoder/GeocoderControl";
import { ProfileConfig } from "./ProfileConfig";

export type EventBase = LocationEvent | ProfilesEvent | RouteEvent | StateEvent

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    readonly routes: { routes: unknown[] }[] = [];
    readonly locations: RoutingLocation[] = [
        new RoutingLocation(-2, false),
        new RoutingLocation(-1, false)];
    readonly events: EventsHub<EventBase> = new EventsHub();
    readonly geocoder: GeocodingControl;

    private ui: UI;
    private profiles: { config: ProfileConfig, backend?: Profile }[] = [];
    private profile = 0;
    private map: Map;
    private snapPoint?: NearestPointOnLine;
    private markerId = 0;
    private route = 0;

    constructor(api: RoutingApi, options?: {
        geocoder: GeocodingControl,
        profiles: ProfileConfig[]
    }) {
        this.api = api;
        this.geocoder = options?.geocoder;
        this.profiles = options?.profiles.map(p => { return { config: p, backend: null as Profile } });
    }

    /**
     * Registers an event handler for the given event.
     * 
     * @param name The name.
     * @param callback The callback.
     */
    on(name: "location" | "location-removed" | "profiles-loaded" | "profile" | "route" | "state",
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

        // create ui.
        const element = document.createElement("div");
        element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        this.ui = new UI(element, { profiles: this.profiles.map(p => p.config), profile: this.profile });
        this.ui.build();
        this.ui.on("search", (idx) => this._geocoder_search(idx));
        this.ui.on("remove", (idx) => this._geocoder_remove(idx));
        this.ui.on("profile", (p) => this._selectProfile(p));
        this.ui.on("route", (r) => this._activateRoute(r));

        // always add 2 locations to start.
        this.ui.addLocation({
            type: "start",
            placeholder: "Van"
        });
        this.ui.addLocation({
            type: "end",
            placeholder: "Naar"
        });

        // hook up events.
        this.map.on("load", () => this._mapLoad());
        this.map.on("click", (e) => this._mapClick(e));
        this.map.on("mousemove", (e) => this._mapMouseMove(e));
        this.map.on("mousedown", () => this._mapMouseDown());
        this.map.on("mouseup", (e) => this._mapMouseUp(e));

        return element;
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
     * Sets the state using the given string.
     * @param state The state to set.
     */
    setFromState(state: string): void {
        // state is as follows:
        // an array of locations comma seperate 
        // with each location: name/lon/lat
        // - when not set but there name=empty
        // - when not geocoded name=point ex: point/4.1445/51.4471
        // - when geocoded name=escaped geocode string, ex: Sept%2042%2F4%2C%202275%20Wechelderzande/4.1445/51.4471
        // - when user location name=user, ex; user/4.1445/51.4471

        if (typeof (state) === "undefined") {
            return;
        }

        // split.
        const locs = state.split(",");

        // get profile.
        this.profile = this.profiles.findIndex(p => p.config.id == locs[0]);
        this.ui.selectProfile(this.profile);

        // reset routes and recalculate.
        for (let i = 0; i < this.routes.length; i++) {
            this.routes[i] = null;
        }

        // parse locations.
        for (let l = 1; l < locs.length; l++) {
            const d = locs[l].split("/");
            if (d.length != 3) return;

            const loc = {
                lng: parseFloat(d[1]),
                lat: parseFloat(d[2])
            };

            const name = unescape(d[0]);
            const index = l - 1;
            let markerDetails: RoutingLocation = null;
            let type: "via" | "user" | "end" | "start" | "empty" = "empty";
            if (index === 0) {
                markerDetails = this._createMarkerRoutingLocation(loc, "start");
                type = "start";
            } else if (index === locs.length - 2) {
                markerDetails = this._createMarkerRoutingLocation(loc, "end");
                type = "end";
            } else if (name !== "empty") {
                markerDetails = this._createMarkerRoutingLocation(loc, "via");
                type = "via";
            }

            // overwrite or add location.
            if (index < this.locations.length) {
                this.locations[index] = markerDetails;
            } else {
                this.locations.push(markerDetails);
            }

            // update ui.
            if (this.ui.count() > index) {
                this.ui.updateLocation(index, { type: type, value: name });
            } else {
                this.ui.addLocation({ type: type, value: name });
            }
        }
        this._hideShowAlternate(this.locations.length <= 2);
        this._calculateRoute();
    }

    private _selectProfile(p: number): void {
        // get profile.
        this.profile = p;

        // reset routes and recalculate.
        for (let i = 0; i < this.routes.length; i++) {
            this.routes[i] = null;
        }

        this.events.trigger("state", {
            state: this._getState()
        });

        this._calculateRoute();
    }

    private _hideShowAlternate(visbility: boolean) {

        if (visbility) {
            this.map.setLayoutProperty("route-case-alternate", "visibility", "visible");
            this.map.setLayoutProperty("route-alternate", "visibility", "visible");
        } else {
            for (let r = this.ui.routeCount() - 1; r >= 0; r--) {
                if (this.route == r) continue;
                
                this.ui.removeRoute(r);
            }

            this.map.setLayoutProperty("route-case-alternate", "visibility", "none");
            this.map.setLayoutProperty("route-alternate", "visibility", "none");
        }
    }

    private _activateRoute(r: number): void {
        this.route = r;

        this.map.setFilter("route-alternate", [
            "all",
            [
                "!=",
                "_route-index",
                r
            ]
        ]);
        this.map.setFilter("route-case-alternate", [
            "all",
            [
                "!=",
                "_route-index",
                r
            ]
        ]);
        this.map.setFilter("route", [
            "all",
            [
                "==",
                "_route-index",
                r
            ]
        ]);
        this.map.setFilter("route-case", [
            "all",
            [
                "==",
                "_route-index",
                r
            ]
        ]);
    }

    private _getState(): string {
        let s = `${escape(this.profiles[this.profile].config.id)}`;
        this.locations.forEach(l => {
            if (s.length > 0) {
                s += ",";
            }

            if (l.isEmpty()) {
                s += `empty`;
                return;
            }

            if (l.isUserLocation) {
                s += `user/`;
            } else {
                if (l.name) {
                    s += `${escape(l.name)}/`;
                } else {
                    s += `point/`;
                }
            }

            const location = l.getLngLat();
            s += `${location.lng.toFixed(5)}/${location.lat.toFixed(5)}`;
        });

        return s;
    }

    /**
     * Sets the profile.
     * 
     * @param profile The profile id.
     */
    setProfile(id: string): void {
        // get profile.
        this.profile = this.profiles.findIndex(p => p.config.id === id);

        // reset routes and recalculate.
        for (let i = 0; i < this.routes.length; i++) {
            this.routes[i] = null;
        }
        this._calculateRoute();
    }

    /**
     * Returns true if a profile was set.
     */
    hasProfileSet(): boolean {
        if (typeof (this.profile) === "undefined") {
            return false;
        }
        return true;
    }

    /**
     * Returns true if the profile is supported.
     * 
     * @param id The profile id.
     */
    hasProfile(id: string): boolean {
        const profile = this.profiles.find(x => x.config.id == id);
        if (typeof (profile) === "undefined") {
            return false;
        }
        return true;
    }

    /**
     * Returns true if the profiles are loaded.
     */
    profilesLoaded(): boolean {
        return typeof (this.profiles) != "undefined";
    }

    /**
     * Use to report the current location of the user.
     * @param l The latest current location.
     */
    reportCurrentLocation(l: { lng: number; lat: number }): void {
        if (this.locations.length <= 0) {
            const locationId = this.markerId++;
            const locationDetails = new RoutingLocation(locationId, true, null, l);
            this.locations.push(locationDetails);

            // set first location as user location in ui.
            this.ui.updateLocation(0, { type: "user", value: "Huidige locatie" });

            // report on new location.
            this.events.trigger("location", {
                component: this,
                location: locationDetails.getLngLat(),
                id: locationDetails.id
            });
            this.events.trigger("state", {
                state: this._getState()
            });

            // calculate if locations.
            if (this.locations.length > 1) {
                this._calculateRoute();
            }
        } else {
            const loc0 = this.locations[0];

            // close or empty, create location based on current location.
            let isCloseOrEmpty = loc0.isEmpty();
            if (!isCloseOrEmpty) {
                const lngLat = loc0.getLngLat();
                const dist = turf.distance([l.lng, l.lat], [lngLat.lng, lngLat.lat]);

                isCloseOrEmpty = dist < 0.001;
            }

            // if location is close to start location, replace it.
            if (loc0.isUserLocation || isCloseOrEmpty) {
                if (loc0.isMarker()) loc0.getMarker().remove();

                const markerDetails = new RoutingLocation(loc0.id, true, null, l);
                this.locations[0] = markerDetails;

                // set first location as user location in ui.
                this.ui.updateLocation(0, { type: "user", value: "Huidige locatie" });
            }
        }
    }

    /**
     * Adds a new location.
     * 
     * First location is taken as origin, next as extra sequential destinations.
     * @param l The location.
     * @param name The name, the geocode location or a custom name.
     */
    addLocation(l: mapboxgl.LngLatLike, name?: string): void {
        // add location or overwrite first empty.
        let index = -1;
        for (let i = 0; i < this.locations.length; i++) {
            const l = this.locations[i];
            if (!l || l.isEmpty()) {
                index = i;
                break;
            }
        }

        // if no empty found, add new.
        if (index < 0) index = this.locations.length;

        // add marker for new location.
        let locationDetails: RoutingLocation = null;
        let type: "via" | "user" | "end" | "start" = "start";
        if (index === 0) {
            locationDetails = this._createMarkerRoutingLocation(l, "start", name);
            type = "start";
        } else {
            locationDetails = this._createMarkerRoutingLocation(l, "end", name);
            type = "end";
        }

        // overwrite location.
        if (index < this.locations.length) {
            this.locations[index] = locationDetails;
        } else {
            this.locations.push(locationDetails);
        }

        // update ui.
        if (this.ui.count() > index) {
            this.ui.updateLocation(index, { type: type, value: name });
        } else {
            this.ui.addLocation({ type: type, value: name });
        }
        if (this.locations.length > 2) {
            const previousLocation = this.locations[this.locations.length - 2];
            this.ui.updateLocation(this.locations.length - 2, { type: "via", value: previousLocation.name });
            this._updateMarkerType(previousLocation.getMarker(), "via");
        }

        // trigger reverse geocode if needed.
        if (!name) {
            const lngLat = LngLat.convert(l);
            this.geocoder.reverseGeocode(lngLat, results => {
                if (results?.length) {
                    this._updateLocationName(index, results[0]);
                }
            });
        }

        // report on new location.
        this.events.trigger("location", {
            component: this,
            location: locationDetails.getLngLat(),
            id: locationDetails.id
        });
        this.events.trigger("state", {
            state: this._getState()
        });

        // calculate if locations.
        if (this.locations.length > 1) {
            this._calculateRoute();
        }
        this._hideShowAlternate(this.locations.length <= 2);
    }

    private _updateLocationName(idx: number, name: string): void {
        this.locations[idx].name = name;
        this.ui.updateLocationName(idx, name);

        this.events.trigger("state", {
            state: this._getState()
        });
    }

    /**marker
     * Inserts a new location at the given index.
     * 
     * @param i The index to insert at.
     * @param l The location to insert.
     */
    insertLocation(i: number, l: mapboxgl.LngLatLike): void {
        // add markers for each location.
        let locationDetails: RoutingLocation = null;
        const index = i;
        if (index === 0) {
            locationDetails = this._createMarkerRoutingLocation(l, "start", "");
        } else {
            locationDetails = this._createMarkerRoutingLocation(l, "via", "");
        }
        this.locations.splice(index, 0, locationDetails);
        if (index > 0) this.routes[index - 1] = undefined;
        this.routes.splice(index, 0, undefined);

        // update ui.
        this.ui.insertLocation(index, { type: "via" });

        // trigger geocode.
        const lngLat = LngLat.convert(l);
        this.geocoder.reverseGeocode(lngLat, results => {
            if (results?.length) {
                this._updateLocationName(index, results[0]);
            }
        });

        // report on new location.
        this.events.trigger("location", {
            component: this,
            location: locationDetails.getLngLat(),
            id: locationDetails.id
        });
        this.events.trigger("state", {
            state: this._getState()
        })

        // calculate if locations.
        if (this.locations.length > 1) {
            this._calculateRoute();
        }
        this._hideShowAlternate(this.locations.length <= 2);
    }

    /**
     * Gets all locations.
     */
    getLocations(): { lng: number, lat: number, id: number }[] {
        const locations: { lng: number, lat: number, id: number }[] = [];
        this.locations.forEach(l => {
            const lngLat = l.getLngLat();
            locations.push({ lng: lngLat.lng, lat: lngLat.lat, id: l.id });
        });

        return locations;
    }

    /**
     * Remove the location with the given id.
     * 
     * @param id The id of the location.
     */
    removeLocation(index: number): boolean {
        if (index < 0) {
            return false;
        }

        const removed = this.locations[index];
        if (!removed) {
            console.log(removed);
            console.log(this.locations);
        }
        const removedLocation = removed.getLngLat();

        // remove marker from map.           
        if (removed.isMarker()) removed.getMarker().remove();

        // don't remove first two, empty them instead.
        if (this.locations.length == 2) {
            const locationId = this.markerId++;
            this.locations[index] = new RoutingLocation(locationId, false);
        } else {
            // remove locations.
            this.locations.splice(index, 1);
        }

        // update ui.
        if (this.ui.count() > 2) {
            this.ui.removeLocation(index);
        } else if (index == 0) {
            this.ui.updateLocation(0, { type: "start", value: "", placeholder: "Van" });
        } else {
            this.ui.updateLocation(1, { type: "end", value: "", placeholder: "Naar" });
        }

        // make sure the last location is of type "end".
        if (this.locations.length > 1) {
            const last = this.locations.length - 1;
            const lastLocation = this.locations[last];
            if (!lastLocation.isEmpty()) {
                this.ui.updateLocation(last, { type: "end", value: this.locations[last].name, placeholder: "Naar" });
                this._updateMarkerType(this.locations[last].getMarker(), "end");
            }
        }

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
        this._hideShowAlternate(this.locations.length <= 2);

        // report on removed location.
        this.events.trigger("location-removed", {
            component: this,
            id: removed.id,
            location: removedLocation
        });
        this.events.trigger("state", {
            state: this._getState()
        })
    }

    private _calculateRoute(): void {
        if (this.locations.length <= 1) return;
        if (this.profile < 0) return;

        const locations: { lng: number, lat: number }[] = [];
        this.locations.forEach(l => {
            if (l.isEmpty()) {
                locations.push(null);
                return;
            }

            const lngLat = l.getLngLat();
            locations.push(lngLat);
        });

        for (let i = 0; i < locations.length - 1; i++) {
            // make sure the array has minimum dimensions.
            while (this.routes.length <= i) {
                this.routes.push(null);
            }
            if (this.routes[i]) continue;
            if (!locations[i]) continue;
            if (!locations[i + 1]) continue;

            const profile = this.profiles[this.profile].config.id;
            this.api.getRoutes({
                locations: [locations[i], locations[i + 1]],
                profiles: [profile, "bicycle.node_network"]
            }, e => {
                this.routes[i] = { routes: [e[profile], e["bicycle.node_network"]] };
                this._updateRoutesLayer();

                this.events.trigger("route", {
                    component: this,
                    index: i,
                    route: this.routes[i]
                });
            });
        }
    }

    private _updateRoutesLayer(): void {
        const routesFeatures: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
            type: "FeatureCollection",
            features: []
        };

        const routeDetails: { distance: number, time: number }[] = [];
        for (let i = 0; i < this.routes.length; i++) {
            if (!this.routes[i]) continue;

            const routes = this.routes[i].routes;

            routes.forEach((route, r) => {
                const geojson = route as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

                let routeDetail = { distance: 0, time: 0 };
                if (r < routeDetails.length) {
                    routeDetail = routeDetails[r];
                } else {
                    routeDetails.push(routeDetail);
                }

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
                            f.properties["_route-segment-index"] = i;
                            f.properties["_route-index"] = r;
                        }
                    });
                    routeDetail.distance += routeDistance;
                    routeDetail.time += routeTime;

                    routesFeatures.features =
                        routesFeatures.features.concat(geojson.features);
                }
            });
        }

        const source: GeoJSONSource = this.map.getSource("route") as GeoJSONSource;
        source.setData(routesFeatures);

        if (this.locations.length > 2) {
            while (1 < this.ui.routeCount()) {
                this.ui.removeRoute(0);
            }

            if (this.ui.routeCount() == 1) {
                this.ui.updateRoute(0, "Snelste route", routeDetails[this.route], true);            
            } else {
                this.ui.addRoute("Snelste route", routeDetails[this.route], true);
            }
        } else {
            while (routeDetails.length < this.ui.routeCount()) {
                this.ui.removeRoute(0);
            }

            routeDetails.forEach((routeDetail, r) => {
                if (r < this.ui.routeCount()) {
                    this.ui.updateRoute(r, "Snelste route", routeDetail, r == this.route);
                } else {
                    this.ui.addRoute("Snelste route", routeDetail, r == this.route);
                }
            });
        }
    }

    private _mapLoad(): void {
        // trigger load profiles
        this.api.getProfiles(profiles => {

            this.profiles = this.profiles.map(p => {
                p.backend = profiles.find(x => x.id == p.config.id);
                return p;
            });

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
        const routeColor = "#1da1f2";
        this.map.addLayer({
            "id": "route-case",
            "type": "line",
            "source": "route",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#fff",
                "line-gap-width": 5,
                "line-width": 2
            },
            "filter": [
                "all",
                [
                    "==",
                    "_route-index",
                    0
                ]
            ]
        }, lowestLabel);
        this.map.addLayer({
            "id": "route-case-alternate",
            "type": "line",
            "source": "route",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#fff",
                "line-gap-width": 5,
                "line-width": 2
            },
            "filter": [
                "all",
                [
                    "!=",
                    "_route-index",
                    0
                ]
            ]
        }, lowestLabel);
        this.map.addLayer({
            "id": "route-alternate",
            "type": "line",
            "source": "route",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#94b8b8",
                "line-width": 5
            },
            "filter": [
                "all",
                [
                    "!=",
                    "_route-index",
                    0
                ]
            ]
        }, lowestLabel);
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
                "line-width": 5
            },
            "filter": [
                "all",
                [
                    "==",
                    "_route-index",
                    0
                ]
            ]
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
                "circle-stroke-width": 3,
                "circle-radius": 5
            }
        }, lowestLabel);
    }

    private _updateMarkerType(marker: Marker, type: "start" | "via" | "end") {
        const element = marker.getElement();

        element.innerHTML = "";
        if (type == "end") {
            element.className = "marker-destination mapboxgl-marker";
            element.innerHTML = ComponentHtml["marker"];
        } else {
            element.className = "marker-via mapboxgl-marker";
            element.innerHTML = ComponentHtml["via"];
        }
    }

    private _createMarkerRoutingLocation(l: mapboxgl.LngLatLike, type: "start" | "via" | "end", name?: string): RoutingLocation {
        const element = document.createElement("div");

        let offset: PointLike = [0, -20];
        if (type == "end") {
            element.className = "marker-destination";
            element.innerHTML = ComponentHtml["marker"];
        } else {
            element.className = "marker-via";
            element.innerHTML = ComponentHtml["via"];
            offset = [0, 0]
        }

        const marker = new Marker(element, {
            draggable: true,
            offset: offset
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

            // trigger geocode.
            const lngLat = marker.getLngLat();
            this.geocoder.reverseGeocode(lngLat, results => {
                if (results?.length) {
                    this._updateLocationName(index, results[0]);
                }
            });

            // trigger event.
            this.events.trigger("location", {
                component: this,
                id: markerId,
                location: marker.getLngLat()
            });
            this.events.trigger("state", {
                state: this._getState()
            })

            // recalculate routes.
            this._calculateRoute();
        });

        // add click event.
        element.addEventListener("click", (e) => {
            // get marker index.
            const index = this.locations.findIndex(l => {
                return l.id == markerId;
            });
            this.removeLocation(index);
            e.stopPropagation();
        }, true);

        return new RoutingLocation(markerId, false, marker, null, name);
    }

    private _mapClick(e: MapMouseEvent) {
        if (typeof (this.snapPoint) !== "undefined") {
            return;
        }
        this.addLocation(e.lngLat, "");
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
                if (l.isEmpty()) continue;

                const location = l.getLngLat();
                const pl = this.map.project(location);
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

    private _geocoder_remove(idx: number): void {
        console.log(idx);
        this.removeLocation(idx);
    }

    private _geocoder_search(idx: number): void {
        console.log("search:" + idx);
    }
}