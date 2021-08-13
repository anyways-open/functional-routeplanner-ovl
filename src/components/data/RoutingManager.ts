import type { Route } from "./Route";
import type { Location } from "./Location";
import type { IForwardResult } from "../../apis/geocoder/IForwardResult";

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

    private actionReverseGeocode: {
        go: boolean
    } = {
            go: false
        };

    constructor(view: string, profile: string, pushState: (state: any) => void,
        geocode: (query: string, callback: (results: IForwardResult[]) => void) => void,
        route: (from: Location, to: Location, profile: string, alternatives: boolean, callback: (results: any) => void) => void) {
        this.pushState = pushState;
        this.geocode = geocode;
        this.route = route;
        this.view = view;
        this.profile = profile;

        this.locations = [{
            id: 0
        },
        {
            id: 1
        }];
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

    }

    /**
     * Called when the user wants to add a new location.
     */
    public onAdd() {

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