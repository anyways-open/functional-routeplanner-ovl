import type { Route } from "./Route";
import type { Location } from "./Location";
import type { IForwardResult } from "../../apis/geocoder/IForwardResult";
import type { IReverseResult } from "../../apis/geocoder/Providers/IReverseResult";

/**
 * Manages the state for the routing component.
 * 
 * Responds to incoming events -> updates internal state accordingly -> push state to component.
 */
export class RoutingManager {
    public static readonly VIEW_START = "START";
    public static readonly VIEW_SEARCH = "SEARCH";
    public static readonly VIEW_ROUTES = "ROUTES";

    private view: string;
    private routes: Route[] = []; // the calculated routes.
    private locations: Location[]; // the start, end and via locations.
    private searchResults: IForwardResult[]; // the current search results.
    private profile: string;
    private searchLocation: number = -1; // the location being searched.
    private focusLocation: number = -1; // the location that has focus.
    private userLocationRequested: boolean; // the user location is requested.
    private userLocationAvailable: boolean = true; // the user location is available.
    private ignoreNextMapClick: boolean = false; // ignore next map click.
    private readonly isMobile;

    private readonly pushState: (state: any) => void; // callback used to push state.

    private routeTimer = setInterval(() => this.action_route(), 500);
    private readonly route: (from: Location, to: Location, profile: string, alternatives: boolean, callback: (results: any) => void) => void;
    private actionRoute: {
        go: boolean
    } = {
            go: false
        };

    private geocodeTimer = setInterval(() => this.action_geocode(), 500);
    private readonly geocode: (query: string, callback: (results: IForwardResult[]) => void) => void;
    private actionGeocode: {
        go: boolean,
        query: string
    } = {
            go: false,
            query: ""
        };

    private reverseGeocodeTimer = setInterval(() => this.action_reverseGeocode(), 500);
    private readonly reverseGeocode: (l: { lng: number; lat: number}, callback: (results: IReverseResult[]) => void) => void;
    private actionReverseGeocode: {
        queue: number[]
    } = {
        queue: []
    };

    constructor(view: string, profile: string, locations: Location[], isMobile: boolean, pushState: (state: any) => void,
        geocode: (query: string, callback: (results: IForwardResult[]) => void) => void,
        reverseGeocode: (l: { lng: number; lat: number}, callback: (results: IReverseResult[]) => void) => void,
        route: (from: Location, to: Location, profile: string, alternatives: boolean, callback: (results: any) => void) => void) {
        this.pushState = pushState;
        this.geocode = geocode;
        this.reverseGeocode = reverseGeocode;
        this.route = route;
        this.isMobile = isMobile;
        this.view = view;
        this.profile = profile;
        this.locations = locations;

        // set view to ROUTES if routes can be calculated.
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }
        if (this.view == RoutingManager.VIEW_ROUTES) this.actionRoute.go = true;
    }

    /**
     * Executes a geocoding query when requested.
     */
    private action_geocode(): void {
        // preconditions: view=SEARCH
        // event: action_geocode
        if (!this.actionGeocode.go) return;
        this.actionGeocode.go = false;

        if (this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("geocoding triggered but not in search view");
            return;
        }

        if (typeof this.geocode === "undefined") {
            console.error("no geocoder configured");
            return;
        }

        this.geocode(this.actionGeocode.query, (results) => {
            this.onGeocoderResults(results);
        });
    }

    /**
     * Executes a routing query when requested.
     */
    private action_route(): void {
        // preconditions: view=ROUTES
        // event: action_route

        if (!this.actionRoute.go) return;
        this.actionRoute.go = false;

        if (this.view !== RoutingManager.VIEW_ROUTES) {
            console.warn("routing triggered but not in routing view");
            return;
        }

        if (typeof this.route === "undefined") {
            console.error("no routing configured");
            return;
        }

        // take no action if there is no profile defined.
        if (typeof this.profile === "undefined") {
            console.error("no profile set");
            return;
        }

        // trigger a route recalculation for each segment that is dirty in the primary route.
        const alternatives = this.locations.length == 2;
        const route = this.routes[0];
        const profile = this.profile;
        for (let l = 1; l < this.locations.length; l++) {
            // check if the segments needs to be calculated.
            const s = l - 1;
            if (typeof route?.segments !== "undefined" &&
                s < route.segments.length) {
                if (typeof route.segments[s] !== "undefined") continue;
            }

            // segments needs calculation
            const from = this.locations[l - 1];
            const to = this.locations[l];

            if (typeof from === "undefined" || typeof from.location === "undefined") continue;
            if (typeof to === "undefined" || typeof to.location === "undefined") continue;

            this.route(from, to, profile, alternatives, (segment) => {
                if (segment[profile + "0"]) {
                    // route with alternative, we have only one segment here with a possible altenerative.
                    this.onRouteSegmentResult(0, 0, segment[profile + "0"]);

                    if (s !== 0) {
                        console.error("route with alternatives returned on non-first segment");
                        return;
                    }
                    for (var a = 1; a <= 3; a++) {
                        var alternative = segment[profile + `${a}`];
                        if (alternative) {
                            this.onRouteSegmentResult(a, 0, alternative);
                        }
                    }
                } else {
                    // a route that is a missing segment.
                    this.onRouteSegmentResult(0, s, segment);
                }
            });
        }
    }

    /**
     * Executed when a reverse geocoding query is requested.
     */
    private action_reverseGeocode(): void {
        // preconditions: view=ROUTES|START
        // event: action_route

        if (this.view !== RoutingManager.VIEW_ROUTES && 
            this.view !== RoutingManager.VIEW_START) {
            console.warn("reverse geocoding triggered but not in routing or start view");
            return;
        }

        if (this.actionReverseGeocode.queue.length == 0) return;
        const l = this.actionReverseGeocode.queue.pop();
        const location = this.locations[l];

        if (typeof location === "undefined" || typeof location.location === "undefined") {
            console.warn("reverse geocoding triggered on empty location");
            return;
        }
        this.reverseGeocode(location.location, (results) => {
            this.onReverseGeocodeResult(l, results);
        });
    }

    /**
     * Called then the user select a profile.
     * @param profile The selected profile.
     */
    public onSelectProfile(profile: string) {
        // preconditions: none
        // event: onSelectProfile
        // internal state:
        // - profile: profile
        // - reset all segments.
        // actions: 
        // - calculate route.
        // push: 
        // - profile
        // - routes

        // update internal state.
        if (this.profile === profile) {
            console.warn("profile update was requested for already configure profile");
            return;
        }
        this.profile = profile;
        this.routes = [];

        // trigger actions.
        this.actionRoute.go = true;

        // push state.
        this.pushState({
            profile: this.profile,
            routes: this.routes
        });
    }

    /**
     * Called when the user wants to start a search for the given location.
     * @param l The location index.
     */
    public onSearch(l: number) {
        // preconditions: view=ROUTES|START
        // event: onSearch
        // internal state:
        // - searchLocation: l
        // - view: SEARCH
        // - clear location
        // actions: 
        // {none}
        // push: 
        // - update the view to SEARCH.
        // - searchLocation: l
        // - locations

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_START) {
            console.warn("search was requested with incorrect preconditions");
            return;
        }

        // update internal state.
        this.locations[l].backup = Object.assign({}, this.locations[l]);
        this.locations[l].isUserLocation = false;
        this.locations[l].description = "";
        this.searchLocation = l;
        this.view = RoutingManager.VIEW_SEARCH;

        // push state.
        this.pushState({
            view: this.view,
            searchLocation: this.searchLocation,
            locations: this.locations
        });
    }

    /**
     * Called when the user wants to clear or remove a location.
     * @param l The location index.
     */
    public onRemoveOrClear(l: number) {
        // preconditions: view=ROUTES|START|SEARCH
        // event: onRemoveOrClear
        // internal state:
        // - remove or empty out location.
        // - make sure the correct segments are recalculated by clearing them.
        // - reset view to START if no routes anymore.
        // actions: 
        // - trigger route calculations.
        // push:
        // - locations.
        // - routes.
        // - view.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_START &&
            this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("add not in correct view");
            return;
        }

        // update state.
        this.routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
            route.segments.splice(l, 1);
        });
        // update locations.
        if (this.locations.length == 2) {
            this.locations[l].description = "";
            this.locations[l].location = undefined;
            this.locations[l].isUserLocation = false;
        } else {
            this.locations.splice(l, 1);
        }

        // set view to ROUTES if routes can be calculated.
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }

        // take actions.
        this.actionRoute.go = true;

        // push state.
        this.pushState({
            routes: this.routes,
            locations: this.locations,
            view: this.view
        });
    }

    /**
     * Called when the user wants to clear or remove a location.
     * @param lid The location id.
     */
     public onRemoveOrClearById(lid: number) {
        // forward to regular on remove.
        const l = this.locations.findIndex((i) => {
            return i.id == lid;
        });
        if (l == -1) {
            console.warn("cannot remove location, id not found");
            return;
        }

        this.onRemoveOrClear(l);
     }

    /**
     * Called when the user wants to add a new location.
     */
    public onAdd() {
        // preconditions: view=ROUTES|START|SEARCH
        // event: onAdd
        // internal state:
        // - add new empty location.
        // - set view to START, new location is unknown.
        // - if active location reset.
        // actions: 
        // {none}
        // push:
        // - locations.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_START &&
            this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("add not in correct view");
            return;
        }

        // update state.
        if (this.view == RoutingManager.VIEW_SEARCH) {
            if (this.searchLocation === -1) {
                console.error("in search view but no search location.");
                return;
            }

            const l = this.searchLocation;
            if (typeof this.locations[l].backup === "undefined") {
                console.error("in search view but search location has no backup.");
                return;
            }

            // restore backup.
            this.locations[l] = this.locations[l].backup;
        }

        // add a new location with a new id.
        this.view = RoutingManager.VIEW_START;
        let nextLocationId = 0;
        this.locations.forEach(l => {
            if (l.id + 1 > nextLocationId) nextLocationId = l.id + 1;
        });
        this.locations.push({
            id: nextLocationId,
            description: "",
            isUserLocation: false
        });

        // push state.
        this.pushState({
            locations: this.locations,
            view: this.view
        });
    }

    /**
     * Called when the load is loaded.
     */
    public onMapLoaded(): void {
        // preconditions: none
        // event: onMapLoaded
        // internal state:
        // if (view==START)
        // - check if a location is user location.
        // - set activeLocation to that location
        // actions: 
        // - if yes, trigger select user location.
        // push:
        // nothing

        if (this.view != RoutingManager.VIEW_START) return;

        let l = this.locations.findIndex(x => x.isUserLocation);
        if (l !== -1) {
            this.userLocationRequested = true;
            this.searchLocation = l;
    
            // push state.
            this.pushState({
                searchLocation: this.searchLocation,
                userLocationRequested: this.userLocationRequested
            });
        }
    }

    /**
     * Called when a location needs to be inserted, usually after dragging.
     */
    public onInsertLocation(index: number, location: { lng: number, lat: number }) {
        // preconditions: view=ROUTES|SEARCH
        // event: onInsertLocation
        // internal state:
        // - insert location before the location with the given index.
        // - remove route segment index - 1
        // - set view to ROUTES if route can be calculated.
        // - trigger reverse geocode.
        // - trigger routing.
        // - ignore next map click.
        // actions: 
        // {none}
        // push:
        // - view
        // - locations.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("add not in correct view");
            return;
        }

        // update state.
        this.ignoreNextMapClick = true;
        let nextLocationId = -1;
        this.locations.forEach(l => {
            if (l.id + 1 > nextLocationId) nextLocationId = l.id + 1;
        });
        let l = index;
        this.routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            route.segments.splice(l - 1, 0, undefined);
        });
        this.locations.splice(l, 0, {
            id: nextLocationId,
            isUserLocation: false,
            description: `${location.lng},${location.lat}`,
            location: location
        });

        // set view to ROUTES.
        this.view = RoutingManager.VIEW_ROUTES;

        // trigger actions.
        if (this.view == RoutingManager.VIEW_ROUTES) this.actionRoute.go = true;
        if (this.actionReverseGeocode.queue.findIndex(x => l == x) == -1) this.actionReverseGeocode.queue.push(l);

        // push state.
        this.pushState({
            locations: this.locations,
            view: this.view
        });
    }

    /**
     * Called when the user clicks on the map.
     */
    public onMapClick(location: { lng: number, lat: number }) {
        // preconditions: view=ROUTES|START|SEARCH
        // event: onMapClick
        // internal state:
        // - update first empty location or add new one.
        // - set view to ROUTEs is route can be calculated.
        // - trigger reverse geocode.
        // - trigger routing.
        // - if in search mode, replace destination.
        // actions: 
        // {none}
        // push:
        // - view
        // - locations.
        
        if (this.ignoreNextMapClick) {
            this.ignoreNextMapClick = false;
            return;
        }

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_START &&
            this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("add not in correct view");
            return;
        }

        // update state.
        let l = -1;
        if (this.view !== RoutingManager.VIEW_SEARCH) {
            // find first empty location or add empty one.
            l = this.locations.findIndex(x => typeof x.location == "undefined");
            if (l == -1) {
                let nextLocationId = -1;
                this.locations.forEach(l => {
                    if (l.id + 1 > nextLocationId) nextLocationId = l.id + 1;
                });
                this.locations.push({
                    id: nextLocationId,
                    description: "",
                    isUserLocation: false,
                    location: location
                });
                l = this.locations.length - 1;
            } 
            const newLocation = this.locations[l];
            newLocation.location = location;
            newLocation.description = `${location.lng},${location.lat}`;
            newLocation.isUserLocation = false;
        } else {
            if (this.searchLocation === -1) {
                console.error("in search view but no search location.");
                return;
            }

            l = this.searchLocation;
            this.routes.forEach((route) => {
                if (typeof route === "undefined") return;
    
                if (l > 0 && l < route.segments.length + 1) {
                    route.segments[l - 1] = undefined;
                }
                if (l < route.segments.length) {
                    route.segments[l] = undefined;
                }
                route.segments.splice(l, 1);
            });
            this.locations[this.searchLocation] = {
                id: this.locations[this.searchLocation].id,
                isUserLocation: false,
                description: `${location.lng},${location.lat}`,
                location: location
            };
        }

        // set view to ROUTES if routes can be calculated.
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }

        // trigger actions.
        if (this.view == RoutingManager.VIEW_ROUTES) this.actionRoute.go = true;
        if (this.actionReverseGeocode.queue.findIndex(x => l == x) == -1) this.actionReverseGeocode.queue.push(l);

        // push state.
        this.pushState({
            locations: this.locations,
            view: this.view
        });
    }

    /**
     * Called when the user wants to switch the first to locations.
     */
    public onSwitch() {
        // preconditions: view=ROUTES|START
        // event: onSwitch
        // internal state:
        // - switch first two locations.
        // - reset routes.
        // actions: 
        // - trigger route calculation
        // push:
        // - locations.
        // - routes.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_START) {
            console.warn("switch not in correct view");
            return;
        }

        // update state
        const location = this.locations[0];
        this.locations[0] = this.locations[1];
        this.locations[1] = location;
        this.routes = [];

        // take action.
        this.actionRoute.go = true;

        // push state.
        this.pushState({
            locations: this.locations,
            routes: this.routes
        });
    }

    /**
     * Called when the user is typing a search query.
     * @param query 
     */
    public onSearchInput(query: string) {
        // preconditions: view=SEARCH
        // event: onSearchInput
        // internal state:
        // {no change}
        // actions: 
        // - trigger forward geocoder.
        // push:
        // {no change}

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("search input recieved but not in search view");
            return;
        }
        // TODO: what to do with empty query?

        // actions
        this.actionGeocode.query = query;
        this.actionGeocode.go = true;

        // no state updates to push.
    }

    /**
     * Called when geocoder results are available.
     * @param results The results.
     */
    private onGeocoderResults(results: IForwardResult[]): void {
        // preconditions: view=SEARCH
        // event: onGeocoderResults
        // internal state:
        // - searchResults: results
        // actions: 
        // {none}
        // push:
        // - searchResults

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("geocoding result recieved but not in search view");
            return;
        }

        // update state.
        this.searchResults = results;

        // push state.
        this.pushState({
            searchResults: this.searchResults
        });
    }

    /**
     * Called when the user want to cancel the search and go back.
     */
    public onCancelSearch() {
        // preconditions: 
        //  view=SEARCH
        //  searchLocation!=-1
        // event: onCancelSearch
        // internal state:
        // - restore location backup.
        // - set view to routes or start depending on routes.
        // actions: 
        // - none
        // push:
        // - locations after update.
        // - view

        if (this.view !== RoutingManager.VIEW_SEARCH) {
            console.error("search cancelled but not in search view");
            return;
        }

        // update state.
        this.locations[this.searchLocation] = this.locations[this.searchLocation].backup;
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }

        // push state.
        this.pushState({
            locations: this.locations,
            view: this.view
        });
    }

    /**
     * Called when the user selects a search result.
     * @param r The index of the search result.
     */
    public onSelectResult(r: number) {
        // preconditions: 
        //  view=SEARCH
        //  searchLocation!=-1
        // event: onSelectResult
        // internal state:
        // - update location with result.
        // - view: ROUTE if route can be calculated, START if route cannot be calculated
        // - clear searchResults.
        // - reset searchLocation
        // - set focusLocation.
        // actions: 
        // - calculate route.
        // push:
        // - locations after update.
        // - view
        // - searchResults
        // - searchLocation
        // - focusLocation

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("result selected but not in search view");
            return;
        }
        if (this.searchLocation == -1) {
            console.error("result selected but there is no active location");
            return;
        }

        // update state.
        const result = this.searchResults[r];
        const l = this.searchLocation;
        this.routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
            route.segments.splice(l, 1);
        });
        this.locations[this.searchLocation] = {
            id: this.locations[this.searchLocation].id,
            isUserLocation: false,
            description: result.description,
            location: result.location
        };
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }

        this.searchResults = [];
        this.focusLocation = this.searchLocation;
        this.searchLocation = -1;

        // take action.
        this.actionRoute.go = true;

        // push state.
        this.pushState({
            locations: this.locations,
            view: this.view,
            focusLocation: this.focusLocation,
            searchLocation: this.searchLocation,
            searchResults: this.searchResults
        });
    }

    /**
     * Called when the users want to use their location.
     */
    public onSelectUserLocation() {
        // preconditions: 
        //  view=SEARCH
        //  searchLocation!=-1
        // event: onSelectUserLocation
        // internal state:
        // - userLocationRequested:true
        // - routes segments around location are cleared.
        // actions: 
        // - set a timeout to wait for the user location to come in or not.
        // push:
        // - TODO: what do do while waiting for user location.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_SEARCH) {
            console.warn("user location selected but not in search view");
            return;
        }
        if (this.searchLocation == -1) {
            console.error("user location selected but there is no active location");
            return;
        }

        // update state.
        const l = this.searchLocation;
        this.routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
            route.segments.splice(l, 1);
        });
        this.userLocationRequested = true;

        // push state.
        this.pushState({
            userLocationRequested: this.userLocationRequested
        });
    }

    /**
     * Called when a user location update is available.
     * @param userLocation The location result.
     */
    public onUserLocation(userLocation: { lng: number, lat: number }): void {
        // preconditions: 
        //  if (view=SEARCH) {
        //      searchLocation!=-1
        //      userLocationRequest: true
        //  }
        //  if (view=ROUTES|START) {
        //      one location that is user location.
        //  }
        // event: onUserLocation
        // internal state:
        //  if (view=SEARCH) {
        //   - userLocationRequest: false
        //   - update location with result.
        //   - view: ROUTE if route can be calculated, START if route cannot be calculated
        //   - searchLocation=-1
        //  }
        //  if (view=ROUTES|START) {
        //      update location that is set as user location with new location.
        //  }
        // actions: 
        // - calculate route.
        // - trigger reverse geocoding.
        // push:
        // - locations after update.
        // - view
        // - searchLocation

        // check preconditions.
        let l = -1;
        if (this.view === RoutingManager.VIEW_SEARCH) {
            if (this.searchLocation == -1) {
                console.error("user location returned there is no active location");
                return;
            }
            if (!this.userLocationRequested) {
                console.error("user location returned there is no active request for it");
                return;
            }

            // update state.
            this.userLocationRequested = false;
            l = this.searchLocation;
            this.searchLocation = -1;
        } else {
            this.searchLocation = -1;
            l = this.locations.findIndex(x => x.isUserLocation);
            if (l < 0) {
                console.error("user location returned there is no location with that needs it");
                return;
            }
        }

        // further update state for location that is the user location.
        this.locations[l] = {
            id: this.locations[l].id,
            isUserLocation: true,
            description: "Huidige locatie",
            location: userLocation
        };
        this.routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
            route.segments.splice(l, 1);
        });

        // set view to ROUTES if routes can be calculated.
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }

        // take action.
        if (this.view == RoutingManager.VIEW_ROUTES) this.actionRoute.go = true;
        if (this.actionReverseGeocode.queue.findIndex(x => l == x) == -1) this.actionReverseGeocode.queue.push(l);

        // push state.
        this.pushState({
            locations: this.locations,
            view: this.view,
            searchLocation: this.searchLocation
        });
    }

    /**
     * Called when getting user location fails.
     */
    public onUserLocationError(): void {        
        // preconditions: 
        //  if (view=SEARCH) {
        //      searchLocation!=-1
        //      userLocationRequested: true
        //  }
        // event: onUserLocationError
        // internal state:
        //  userLocationRequested: false
        //  userLocationAvailable: false
        // actions: 
        // if (view=SEARCH) trigger new focus event.
        // push:
        // - userLocationRequested
        // - userLocationAvailable
        
        // take action.
        if (this.view == RoutingManager.VIEW_SEARCH) {
            if (this.searchLocation == -1) {
                console.error("user location error there is no active location");
                return;
            }
            if (!this.userLocationRequested) {
                console.error("user location error there is no active request for it");
                return;
            }
        }

        // update state.
        this.userLocationRequested = false;
        this.userLocationAvailable = false;

        // push state
        this.pushState({
            userLocationAvailable: this.userLocationAvailable,
            userLocationRequested: this.userLocationRequested
        });
    }

    /**
     * Called when a locations' location is to be updated.
     * @param lid The location id.
     * @param location The new location.
     */
    public onLocationUpdateById(lid: number, location: {lng: number, lat: number}): void {
        // preconditions: {none}
        // event: onLocationUpdateById
        // internal state:
        // - update location.
        // - remove route segments using the location.
        // - update view if routes possible.
        // actions: 
        // - trigger reverse geocoding.
        // - trigger routing.
        // push:
        // - locations.
        // - routes.
        // - view

        const l = this.locations.findIndex((i) => {
            return i.id == lid;
        });
        if (l == -1) {
            console.warn("cannot update location, id not found");
            return;
        }

        // cancel search if in search view.
        if (this.view == RoutingManager.VIEW_SEARCH) {
            this.locations[this.searchLocation] = this.locations[this.searchLocation].backup;
        }

        // further update state for location that is the user location.
        this.routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
            route.segments.splice(l, 1);
        });
        this.locations[l].location = location;
        this.locations[l].description = `${location.lng},${location.lat}`;
        this.locations[l].isUserLocation = false;

        // set view to ROUTES if routes can be calculated.
        this.view = RoutingManager.VIEW_ROUTES;
        for (let s = 0; s < this.locations.length - 1; s++) {
            const from = this.locations[s];
            const to = this.locations[s + 1];
            if (typeof from === "undefined" ||
                typeof from.location === "undefined" ||
                typeof to === "undefined" ||
                typeof to.location === "undefined") {
                this.view = RoutingManager.VIEW_START;
                break;
            }
        }

        // take action.
        if (this.view == RoutingManager.VIEW_ROUTES) this.actionRoute.go = true;
        if (this.actionReverseGeocode.queue.findIndex(x => l == x) == -1) this.actionReverseGeocode.queue.push(l);

        // push state.
        this.pushState({
            locations: this.locations,
            routes: this.routes
        });
    }

    private onReverseGeocodeResult(l: number, results: IReverseResult[]): void {
        // preconditions: {none}
        // event: onReverseGeocodeResult
        // internal state:
        // - update location.
        // actions: 
        // {none}
        // push:
        // - locations.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES &&
            this.view !== RoutingManager.VIEW_START) {
            console.warn("switch not in correct view");
            return;
        }
        if (typeof results === "undefined" || 
            results.length == 0) {
                return;
            }

        // update state.
        if (l >= this.locations.length) {
            console.warn("location to reverse geocode for not found");
            return;
        }
        const location = this.locations[l];
        if (typeof location === "undefined") {
            console.warn("location to reverse geocode for not found");
            return;
        }
        this.locations[l].description = results[0].description;

        // update state.
        this.pushState({
            locations: this.locations;
        });
    }

    /**
     * Called when a route segment result is available.
     * @param r The route the segment is for, usually 0 but for alternative routes 1 or above.
     * @param segment The segment index.
     * @param route The route data.
     */
    private onRouteSegmentResult(r: number, segment: number, data: any): void {
        // preconditions: 
        //  view=ROUTES
        // event: onRouteSegmentResult
        // internal state:
        // - update routes with new segment
        // actions: 
        // {no actions}
        // push:
        // - view.
        // - routes.

        // check preconditions.
        if (this.view !== RoutingManager.VIEW_ROUTES) {
            console.warn("route result but not in route view");
            return;
        }

        // update state.
        while (r >= this.routes.length) this.routes.push({
            segments: [],
            description: ""
        });
        const route = this.routes[r];
        if (typeof route.segments === "undefined") route.segments = [];
        while (segment >= route.segments.length) route.segments.push(undefined);
        route.segments[segment] = data;
        this.routes[r].description = r == 0 ? "Aangeraden route" : "Alternatieve route";

        // push state.
        this.pushState({
            view: this.view,
            routes: this.routes
        });
    }
}