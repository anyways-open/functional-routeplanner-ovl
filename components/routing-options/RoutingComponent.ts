import mapboxgl, { GeoJSONSource, IControl, Map, MapMouseEvent, Marker } from "mapbox-gl";
import { RoutingApi, Profile } from "@anyways-open/routing-api";
import ComponentHtml from "*.html";
import { EventsHub } from "../../libs/events/EventsHub";
import { RoutingComponentEvent } from "./RoutingComponentEvent";
import * as turf from "@turf/turf";
import { NearestPointOnLine } from "@turf/nearest-point-on-line";

export class RoutingComponent implements IControl {
    readonly api: RoutingApi;
    readonly routes: any[] = [];
    readonly locations: { marker: Marker, id: number }[] = [];
    readonly events: EventsHub<RoutingComponentEvent> = new EventsHub();
    readonly profiles: { id: string, description: string }[] = [];
    profile: string;

    element: HTMLElement;
    map: Map;
    snapPoint?: NearestPointOnLine;

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
        this.map.on("mousemove", (e) => this._mapMouseMove(e));
        this.map.on("mousedown", (e) => this._mapMouseDown(e));
        this.map.on("mouseup", (e) => this._mapMouseUp(e));

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

        const removed = this.locations[index];

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
            marker: removed
        });
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
        const routesFeatures: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
            type: "FeatureCollection",
            features: []
        };

        let totalDistance = 0;
        for (let i = 0; i < this.routes.length; i++) {
            const r = this.routes[i];

            if (r && r.features) {
                let routeDistance = 0;
                r.features.forEach((f: { properties: { distance: string; }; }) => {
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
                "circle-stroke-width": 5,
                "circle-radius": [
                    "interpolate", ["linear"], ["zoom"],
                    10, 6,
                    14, 8,
                    16, 26
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
                if (typeof(l) === "undefined") continue;

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

    private _mapMouseDown(e: MapMouseEvent) {
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