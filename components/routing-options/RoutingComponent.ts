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
import { Routes } from "./Routes";
var togpx = require('togpx');

export type EventBase = LocationEvent | ProfilesEvent | RouteEvent | StateEvent

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    readonly routes: Routes = new Routes();
    // readonly routes: { // an array of routes along all locations.
    //     routes: {
    //         route: unknown, // the route or multiple if alternative routes.
    //         description: string
    //     }[]
    // }[] = [];
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
    private routeSequence = 0;
    private latestSearchResults: { location: number, results: { description: string, location: { lng: number; lat: number } }[] };

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
    on(name: "location" | "location-removed" | "profiles-loaded" | "profile" | "route" | "state" | "legenda",
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
        this.ui.on("download", (r) => this._downloadRoute(r));
        this.ui.on("geocoded", (r) => this._acceptSearchResult(r));
        this.ui.on("menu", (r) => this.events.trigger("legenda"));
        this.ui.on("add", (idx) => this.addEmptyLocation(idx));

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
        this.routes.clear();

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

    private _downloadRoute(idx: number) {

        let segments: GeoJSON.FeatureCollection<GeoJSON.Geometry>[];
        if (idx == 0) {
            // regular route.
            segments = this.routes.getSegments();
        } else {
            // alternative route.
            segments = [ this.routes.getAlternativeSegments(idx - 1) ];
        }

        // convert to a single linestring per segment.
        var features = [];
        segments.forEach((r) => {
            const coordinates = [];
            r.features.forEach(f => {
                if (f.geometry.type == "LineString") {
                    if (coordinates.length == 0) {
                        coordinates.push(...f.geometry.coordinates);
                    } else {
                        coordinates.push(...f.geometry.coordinates.slice(1));
                    }
                } else {
                    features.push(f);
                }
            });

            features.push(turf.lineString(coordinates));
        });
        var geojson = turf.featureCollection(features);

        var gpx = togpx(geojson);

        var data = gpx;
        var type = ".gpx";
        var filename = "route.gpx";

        var file = new Blob([data], { type: type });
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    private _selectProfile(p: number): void {
        // get profile.
        this.profile = p;

        // reset routes and recalculate.
        this.routes.clear();

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
        this.routes.clear();
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

    private addEmptyLocation(index: number): void {

        // add marker for new location.
        const markerId = this.markerId++;
        let locationDetails: RoutingLocation = new RoutingLocation(markerId, false);

        // overwrite location.
        if (index < this.locations.length) {
            this.locations[index] = locationDetails;
        } else {
            this.locations.push(locationDetails);
        }

        // update ui.
        this.ui.addLocation({ type: "end" });
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
            previousLocation.updateMarkerType("via");
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

    setLocation(i: number, l: mapboxgl.LngLat, name?: string) {
        // make sure the location exists, or is empty.
        while (i >= this.locations.length) {
            this.locations.push(new RoutingLocation(-this.locations.length, false));
        }
        const index = i;

        // determine type.
        let type: "via" | "user" | "end" | "start" = "via";
        if (index === 0) {
            type = "start";
        } else if (index == this.locations.length - 1) {
            type = "end";
        }

        // add marker for location if it doesn't exist yet.
        let location = this.locations[index];
        if (location.isEmpty()) {
            location = this._createMarkerRoutingLocation(l, type, name);
            this.locations[index] = location;
        } else {
            this._updateLocationLocation(index, l);
            this._updateLocationName(index, name);
        }

        // make sure route recalculates.
        this.routes.clearForLocation(index);

        // update ui.
        if (this.ui.count() > index) {
            this.ui.updateLocation(index, { type: type, value: name });
        } else {
            this.ui.addLocation({ type: type, value: name });
        }
        if (this.locations.length > 2) {
            const previousLocation = this.locations[this.locations.length - 2];
            this.ui.updateLocation(this.locations.length - 2, { type: "via", value: previousLocation.name });
            previousLocation.updateMarkerType("via");
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
            location: location.getLngLat(),
            id: location.id
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
        if (index > 0) this.routes.clearAt(index - 1);
        this.routes.insert(index, null);

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
        });

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
                //this._updateMarkerType(this.locations[last].getMarker(), "end");
                this.locations[last].updateMarkerType("end");
            }
        }

        // remove route with this location as target.
        this.routes.removeForLocation(index);

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
        });
    }

    private _updateLocationLocation(i: number, location: { lng: number; lat: number }): void {
        const loc = this.locations[i];
        loc.setLngLat(location);
    }

    private _calculateRoute(): void {
        if (this.locations.length <= 1) return;
        if (this.profile < 0) return;

        this.routeSequence++;
        var sequenceNumber = this.routeSequence;

        const locations: { lng: number, lat: number }[] = [];
        this.locations.forEach(l => {
            if (l.isEmpty()) {
                locations.push(null);
                return;
            }

            const lngLat = l.getLngLat();
            locations.push(lngLat);
        });

        const doAlternatives = locations.length == 2;
        for (let i = 0; i < locations.length - 1; i++) {
            // make sure the array has minimum dimensions.
            if (this.routes.hasRoute(i)) continue;
            if (!locations[i]) continue;
            if (!locations[i + 1]) continue;

            const profile = this.profiles[this.profile].config.id;
            this.api.getRoute({
                locations: [locations[i], locations[i + 1]],
                profile: profile,
                alternatives: doAlternatives ? 2 : null
            }, e => {
                if (this.routeSequence != sequenceNumber) {
                    console.warn(`Routing was too slow, number at ${this.routeSequence}, but response has ${sequenceNumber}`);
                    return;
                }

                if (e[profile + "0"]) {
                    this.routes.set(i, e[profile + "0"]);

                    for (var a = 1; a <= 3; a++) {
                        var alternative = e[profile + `${a}`];
                        if (alternative) {
                            this.routes.setAlternative(a - 1, alternative)
                        }
                    }
                } else {
                    this.routes.set(i, e);
                }

                this._updateRoutesLayer();

                this.events.trigger("route", {
                    component: this,
                    index: i,
                    route: this.routes.get(i)
                });
            });
        }
    }

    private _updateRoutesLayer(): void {
        const routesFeatures: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
            type: "FeatureCollection",
            features: []
        };

        // route details, usually just 1, but there could be an alternative route.
        const routeDetails: { distance: number, time: number, description: string }[] = [];

        // add regular route.
        const routeSegments = this.routes.getSegments();
        let firstLineString: GeoJSON.LineString = null;
        for (let i = 0; i < routeSegments.length; i++) {
            const routeSegment = routeSegments[i];
            if (!routeSegment) continue;

            const geojson = routeSegment as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

            let routeDetail = { distance: 0, time: 0, description: "Aangeraden route" };
            if (geojson && geojson.features) {
                let routeDistance = 0;
                let routeTime = 0;

                let lastLineString: GeoJSON.LineString = null;
                geojson.features.forEach((f) => {
                    if (f && f.properties) {
                        if (f.properties.distance) {
                            routeDistance = parseFloat(f.properties.distance);
                        }
                        if (f.properties.time) {
                            routeTime = parseFloat(f.properties.time);
                        }
                        f.properties["_route-segment-index"] = i;
                        f.properties["_route-index"] = 0;

                            if (f.geometry.type == "LineString") {
                                if (!firstLineString) {
                                    firstLineString = f.geometry as GeoJSON.LineString;
                                    const c = firstLineString.coordinates[0];
                                    this._updateLocationLocation(0, { lng: c[0], lat: c[1] });
                                }
                                lastLineString = f.geometry as GeoJSON.LineString;
                            }
                    }
                });
                routeDetail.distance += routeDistance;
                routeDetail.time += routeTime;

                routesFeatures.features =
                    routesFeatures.features.concat(geojson.features);

                if (lastLineString) {
                    const c = lastLineString.coordinates[lastLineString.coordinates.length - 1];
                    this._updateLocationLocation(i + 1, { lng: c[0], lat: c[1] });
                }
            }
                
            routeDetails.push(routeDetail);
        }

        // add alternative route(s).
        for (let a = 0; a < this.routes.alternativeCount(); a++) {
            const routeSegment = this.routes.getAlternativeSegments(a);
            if (!routeSegment) continue;

            const geojson = routeSegment as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

            let routeDetail = { distance: 0, time: 0, description: "Alternative route" };
            if (geojson && geojson.features) {
                let routeDistance = 0;
                let routeTime = 0;

                let lastLineString: GeoJSON.LineString = null;
                geojson.features.forEach((f) => {
                    if (f && f.properties) {
                        if (f.properties.distance) {
                            routeDistance = parseFloat(f.properties.distance);
                        }
                        if (f.properties.time) {
                            routeTime = parseFloat(f.properties.time);
                        }
                        f.properties["_route-segment-index"] = 0;
                        f.properties["_route-index"] = a + 1;
                    }
                });
                routeDetail.distance += routeDistance;
                routeDetail.time += routeTime;

                routesFeatures.features =
                    routesFeatures.features.concat(geojson.features);
            }
                
            routeDetails.push(routeDetail);
        }

        const source: GeoJSONSource = this.map.getSource("route") as GeoJSONSource;
        source.setData(routesFeatures);

        if (this.locations.length > 2) {
            while (1 < this.ui.routeCount()) {
                this.ui.removeRoute(0);
            }
            if (this.ui.routeCount() == 1) {
                this.ui.updateRoute(0, routeDetails[this.route].description, routeDetails[this.route], true);
            } else {
                this.ui.addRoute(routeDetails[this.route].description, routeDetails[this.route], true);
            }
        } else {
            while (routeDetails.length < this.ui.routeCount()) {
                this.ui.removeRoute(0);
            }

            routeDetails.forEach((routeDetail, r) => {
                if (r < this.ui.routeCount()) {
                    this.ui.updateRoute(r, routeDetails[r].description, routeDetail, r == this.route);
                } else {
                    this.ui.addRoute(routeDetails[r].description, routeDetail, r == this.route);
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
        const routeColorLight = "#1da1f2";
        const routeColorDark = "#0d8bd9";
        const routeColor = routeColorLight;
        const routeColorCasing = "#000";
        this.map.addLayer({
            "id": "route-case",
            "type": "line",
            "source": "route",
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": routeColorCasing,
                "line-gap-width": 7,
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
                "line-color": "#000",
                "line-gap-width": 7,
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
                "line-width": 7
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
                "line-width": 7
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
            offset = [0, -4]
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
            this.routes.clearForLocation(index);

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

        const boxSize = 10;
        const features = this.map.queryRenderedFeatures(
            [[e.point.x - boxSize, e.point.y - boxSize],
            [e.point.x + boxSize, e.point.y + boxSize]], {
            layers: ["route-alternate"],
        });

        if (features.length > 0) {
            let route = -1;
            features.forEach(f => {
                if (f.geometry.type == "LineString") {
                    if (f.properties && typeof (f.properties["_route-index"]) != "undefined") {
                        route = Number(f.properties["_route-index"]);
                    }
                }
            });
            if (route >= 0) {
                this._activateRoute(route);
                this.ui.selectRoute(route);
            }
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
                        if (f.properties && typeof (f.properties["_route-segment-index"]) != "undefined") {
                            const s = turf.nearestPointOnLine(f.geometry, [e.lngLat.lng, e.lngLat.lat]);
                            if (typeof (s) === "undefined") return;
                            if (s.properties.dist) {
                                if (typeof (snapped) === "undefined") {
                                    snapped = s;
                                    snapped.properties["_route-segment-index"] = f.properties["_route-segment-index"];
                                } else {
                                    if (snapped.properties.dist) return;
                                    if (s.properties.dist < snapped.properties.dist) {
                                        snapped = s;
                                        snapped.properties["_route-segment-index"] = f.properties["_route-segment-index"];
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
        if (this._dragging) {
            if (typeof (this.snapPoint) === "undefined") {
                throw Error("Snappoint not set but dragging.");
            }

            const routeIndex: number = this.snapPoint.properties["_route-segment-index"];
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
        } else {
        }
    }

    private _geocoder_remove(idx: number): void {
        this.removeLocation(idx);
    }

    private _geocoder_search(idx: number): void {
        const searchString = this.ui.getLocationValue(idx);

        if (!searchString || searchString.length == 0) {
            this.latestSearchResults = { location: idx, results: [] };
            this.ui.updateSearchResults([], "");
        }

        this.geocoder.geocode(searchString, (result) => {
            if (result.length == 0) return;

            this.latestSearchResults = { location: idx, results: result };
            this.ui.updateSearchResults(result, searchString);
        });
    }


    private _acceptSearchResult(idx: number): void {
        const result = this.latestSearchResults.results[idx];
        const index = this.latestSearchResults.location;

        this.setLocation(index, result.location, result.description);

        this.latestSearchResults = { location: idx, results: [] };
        this.ui.updateSearchResults([], "");
    }
}