

    let lastCurrentLocation: { lng: number; lat: number };
    let currentLocationAvailable: true;

    let locationId: number = 0;

    locations.forEach((l, i) => {
        if (i === 0) return;

        routes.push(undefined);

        if (locationId < l.id) locationId = l.id;
    });

    let urlHash = new UrlHashHandler("route");
    let urlHashParsed = false;
    onMount(async () => {
        // state is as follows:
        // an array of locations comma seperate
        // with each location: name/lon/lat
        // - when not set but there name=empty
        // - when not geocoded name=point ex: point/4.1445/51.4471
        // - when geocoded name=escaped geocode string, ex: Sept%2042%2F4%2C%202275%20Wechelderzande/4.1445/51.4471
        // - when user location name=user, ex; user/4.1445/51.4471
        const routeState = urlHash.getState();
        if (typeof routeState !== "undefined") {
            // split.
            const locs = routeState.split(",");

            // get profile.
            profile = locs[0];

            // reset routes causing recalculate later.
            routes = [];

            // parse locations.
            if (locs.length > 0) {
                locations = [];

                locationId++;
                locations.push({
                    id: locationId,
                });
                locationId++;
                locations.push({
                    id: locationId,
                });

                for (let l = 1; l < locs.length; l++) {
                    const d = locs[l].split("/");
                    if (d.length != 3) continue;

                    const loc = {
                        lng: parseFloat(d[1]),
                        lat: parseFloat(d[2]),
                    };

                    const name = unescape(d[0]);

                    // overwrite locations.
                    locationId++;
                    const location: Location = {
                        id: locationId,
                        description: name,
                        location: loc,
                    };

                    if (l - 1 < locations.length) {
                        locations[l - 1] = location;
                    } else {
                        locations.push(location);
                    }
                }
            }
        }
        urlHashParsed = true;
    });

    $: if (
        typeof profile !== "undefined" &&
        typeof locations !== "undefined" &&
        urlHashParsed
    ) {
        let s = `${escape(profile)}`;
        locations.forEach((l) => {
            if (s.length > 0) {
                s += ",";
            }

            if (typeof l.location === "undefined") {
                s += `empty`;
                return;
            }

            if (l.description) {
                s += `${escape(l.description)}/`;
            } else {
                s += `point/`;
            }

            const location = l.location;
            s += `${location.lng.toFixed(5)}/${location.lat.toFixed(5)}`;
        });

        urlHash.update(s);
    }

    $: if (typeof userLocationLayerHook !== "undefined") {
        userLocationLayerHook.on("geolocate", (pos) => {
            if (viewState.view == VIEW_SEARCH) {
                // do no accept location updates in search view.
                return;
            }

            lastCurrentLocation = pos;

            handleCurrentLocation();
        });
        userLocationLayerHook.on("error", (e) => {
            if (
                viewState.view == VIEW_SEARCH &&
                viewState.search.currentLocation >= 0
            ) {

            }
        });
    }

    function onUseCurrentLocation(): void {
        if (typeof viewState.search !== "undefined") {
            viewState.search.currentLocation = viewState.search.location;

            if (typeof lastCurrentLocation !== "undefined") {
                console.log("using last current");
                handleCurrentLocation();
            } else {
                const l = viewState.search.currentLocation;
                const userLocationLocation = locations[l];

                // update.
                locations.forEach((l) => {
                    l.isUserLocation = false;
                });
                userLocationLocation.isUserLocation = true;
                userLocationLocation.description = undefined;

                locations = [...locations];
                routes = [...routes];

                viewState = { view: VIEW_ROUTES };
            }

            userLocationLayerHook.trigger();
        }
    }

    function handleCurrentLocation() {
        if (
            viewState.view == VIEW_SEARCH &&
            viewState.search.currentLocation >= 0
        ) {
            const l = viewState.search.currentLocation;
            delete viewState.search.currentLocation;
            const userLocationLocation = locations[l];

            // update.
            locations.forEach((l) => {
                l.isUserLocation = false;
            });
            userLocationLocation.isUserLocation = true;
            userLocationLocation.location = lastCurrentLocation;
            userLocationLocation.description = `${lastCurrentLocation.lng},${lastCurrentLocation.lat}`;

            // location has changed, geocode again.
            geocoder.reverseGeocode(
                userLocationLocation.location,
                (results) => {
                    if (results.length > 0) {
                        userLocationLocation.description =
                            results[0].description;

                        locations = [...locations];
                    }
                }
            );

            // make sure to remove the routes using this location.
            routes.forEach((route) => {
                if (typeof route === "undefined") return;

                if (l > 0) {
                    route.segments[l - 1] = undefined;
                }
                if (l < route.segments.length) {
                    route.segments[l] = undefined;
                }
            });

            locations = [...locations];
            routes = [...routes];

            viewState = { view: VIEW_ROUTES };
            return;
        }

        const l = locations.findIndex((x) => x.isUserLocation);
        if (l >= 0) {
            const userLocationLocation = locations[l];
            if (typeof userLocationLocation.location !== "undefined") {
                // update and recalculate if different.
                const distance = turf.distance(
                    [
                        userLocationLocation.location.lng,
                        userLocationLocation.location.lat,
                    ],
                    [lastCurrentLocation.lng, lastCurrentLocation.lat]
                );
                if (distance < 0.01) {
                    return;
                }
            }

            // location is far enough, update.
            userLocationLocation.location = lastCurrentLocation;
            userLocationLocation.description = `${lastCurrentLocation.lng},${lastCurrentLocation.lat}`;

            // location has changed, geocode again.
            geocoder.reverseGeocode(
                userLocationLocation.location,
                (results) => {
                    if (results.length > 0) {
                        userLocationLocation.description =
                            results[0].description;

                        locations = [...locations];
                    }
                }
            );

            // make sure to remove the routes using this location.
            routes.forEach((route) => {
                if (l > 0) {
                    route.segments[l - 1] = undefined;
                }
                if (l < route.segments.length) {
                    route.segments[l] = undefined;
                }
            });

            locations = [...locations];
            routes = [...routes];
            return;
        }
    }

    let lastMarkerBox: {
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
    $: if (typeof locationsLayerHook !== "undefined") {
        locationsLayerHook.on("locationupdate", (e) => {
            lastMarkerBox = e.markerBox;
            const lid: number = e.id;
            const l = locations.findIndex((i) => {
                return i.id == lid;
            });
            const location = locations[l];

            if (typeof location !== "undefined") {
                location.location = e.location;
                location.isUserLocation = false;
                location.description = `${e.location.lng},${e.location.lat}`;
            }

            // location has changed, geocode again.
            geocoder.reverseGeocode(location.location, (results) => {
                if (results.length > 0) {
                    location.description = results[0].description;
                    locations = [...locations];
                }
            });

            // make sure to remove the routes using this location.
            routes.forEach((route) => {
                if (l > 0) {
                    route.segments[l - 1] = undefined;
                }
                if (l < route.segments.length) {
                    route.segments[l] = undefined;
                }
            });

            locations = [...locations];
            routes = [...routes];
        });

        locationsLayerHook.on("locationclick", (e) => {
            const lid: number = e.id;
            const l = locations.findIndex((i) => {
                return i.id == lid;
            });

            removeLocation(l);
        });
    }

    function removeLocation(l: number) {
        routes.forEach((route) => {
            if (typeof route === "undefined") return;

            if (l > 0 && l < route.segments.length + 1) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
            route.segments.splice(l, 1);
        });

        // update locations list.
        if (locations.length == 2) {
            locations[l].description = "";
            locations[l].location = undefined;
            locations[l].isUserLocation = false;
        } else {
            locations.splice(l, 1);
        }

        locations = [...locations];
        routes = [...routes];
    }

    $: if (typeof routeLayerHook !== "undefined") {
        routeLayerHook.on("click", (e) => {
            // TODO: this is a workaround around mapbox gl triggering a click event after dragging a marker, there has to be a better way.
            if (typeof lastMarkerBox !== "undefined") {
                if (
                    lastMarkerBox.left - 1 <= e.point.x &&
                    lastMarkerBox.right + 1 >= e.point.x &&
                    lastMarkerBox.top - 1 <= e.point.y &&
                    lastMarkerBox.bottom + 1 >= e.point.y
                ) {
                    return;
                }
            }
            lastMarkerBox = undefined;

            locationId++;
            const location: Location = {
                id: locationId,
                isUserLocation: false,
                description: `${e.lngLat.lng},${e.lngLat.lat}`,
                location: e.lngLat,
            };

            if (typeof locations[0].location === "undefined") {
                locations[0] = location;
            } else if (typeof locations[1].location === "undefined") {
                locations[1] = location;
            } else {
                locations.push(location);
            }

            locations = [...locations];

            geocoder.reverseGeocode(location.location, (results) => {
                if (results.length > 0) {
                    location.description = results[0].description;
                    locations = [...locations];
                }
            });
        });

        routeLayerHook.on("selectroute", (e) => {
            console.log(e);
        });
    }

    // TODO: move this to general settings files.
    // instantiate the routing api.
    const routingEndpoint = "https://staging.anyways.eu/routing-api2/";
    const routingApi = new RoutingApi(
        routingEndpoint,
        "Vc32GLKD1wjxyiloWhlcFReFor7aAAOz"
    );

    const maxReverseDistance = 100;
    const geocoderProvider = new ChainedProvider(
        [
            {
                provider: new CrabGeolocationProvider(),
                chainForward: (_, current) => {
                    const results = [];
                    let next = current.length == 0;
                    current.forEach((x) => {
                        if (x.type == "commune") {
                            next = true;
                            return;
                        }

                        results.push(x);
                    });

                    results.sort((x, y) => {
                        if (x.score < y.score) return -1;
                        return 1;
                    });

                    return { next: next, results: results };
                },
                chainReverse: (l, _, current) => {
                    let next = current.length == 0;
                    if (current.length > 0) {
                        const dist =
                            turf.distance(
                                [l.lng, l.lat],
                                [
                                    current[0].location.lng,
                                    current[0].location.lat,
                                ]
                            ) * 1000;

                        if (dist > maxReverseDistance) {
                            next = true;
                            current = [];
                        }
                    }
                    return { next: next, results: current };
                },
            },
            {
                provider: new OpenCageDataProvider(
                    "dcec93be31054bc5a260386c0d84be98",
                    {
                        language: "nl",
                    }
                ),
            },
        ],
        {
            maxResults: 5,
            maxReverseDistance: maxReverseDistance,
        }
    );
    const geocoder = new Geocoder(geocoderProvider, {
        forwardPreprocessor: (q) => {
            if (q && q.string && q.string.toLowerCase().startsWith("station")) {
                q = {
                    string: q.string.substring(7),
                    location: q.location,
                };
            }
            return q;
        },
    });

    let searchResults: {
        location: number;
        results: LocationSearchResult[];
    } = {
        location: -1,
        results: [],
    };

    const VIEW_START = "START";
    const VIEW_SEARCH = "SEARCH";
    const VIEW_ROUTES = "ROUTES";

    let viewState: {
        view: "START" | "SEARCH" | "ROUTES";
        search?: {
            location: number;
            placeholder: string;
            currentLocation?: number;
        };
    } = {
        view: VIEW_START,
        search: {
            location: -1,
            placeholder: "",
        },
    };

    function onSelect(e: CustomEvent<LocationSearchResult>): void {
        if (viewState.view != VIEW_SEARCH) return;
        if (typeof viewState.search === "undefined") return;

        searchResults.results = [];

        const l = viewState.search.location;

        locations[l] = {
            id: locations[l].id,
            description: e.detail.description,
            location: e.detail.location,
            isUserLocation: false,
        };

        // zoom to location if a route cannot be calculated yet.
        let canCalulateRoute = false;
        for (var segment = 1; segment < locations.length; segment++) {
            const location1 = locations[segment];
            const location2 = locations[segment + 1];

            if (
                typeof profile === "undefined" ||
                typeof location1 === "undefined" ||
                typeof location1.location === "undefined" ||
                typeof location2 === "undefined" ||
                typeof location2.location === "undefined"
            ) {
            } else {
                canCalulateRoute = true;
            }
        }

        if (!canCalulateRoute) mapHook.flyTo(e.detail.location);

        // make sure to remove the routes using this location.
        routes.forEach((route) => {
            if (l > 0) {
                route.segments[l - 1] = undefined;
            }
            if (l < route.segments.length) {
                route.segments[l] = undefined;
            }
        });

        viewState.view = VIEW_ROUTES;
        viewState.search.location = -1;

        locations = [...locations];
        routes = [...routes];
    }

    $: {
        switch (viewState.view) {
            case VIEW_SEARCH:
                if (typeof routingHook.onSearch !== "undefined") {
                    routingHook.onSearch();
                }
                break;
            case VIEW_ROUTES:
                if (typeof routingHook.onRoutes !== "undefined") {
                    routingHook.onRoutes();
                }
                break;
        }

        if (typeof mapHook !== "undefined") mapHook.resize();
    }

    let routeSequence: number = 0;

    function onSwitch(): void {
        const t = locations[0];
        locations[0] = locations[1];
        locations[1] = t;

        routes = [];
    }

    function getRoutes() {
        // remove alternatives if more than 2 locations.
        if (locations.length > 2) {
            while (routes.length > 1) {
                routes.pop();
            }
            routes = [...routes];
        }

        routeSequence++;
        const sequenceNumber = routeSequence;
        locations.forEach((_, i) => {
            if (i === 0) return;

            const segment = i - 1;

            const location1 = locations[segment];
            const location2 = locations[segment + 1];

            // only calculate if locations are available and profile is set.
            if (
                typeof profile === "undefined" ||
                typeof location1.location === "undefined" ||
                typeof location2.location === "undefined"
            ) {
                return;
            }

            // only calculate if segment is not there yet.
            if (
                routes.length > 0 &&
                typeof routes[0] !== "undefined" &&
                typeof routes[0].segments[segment] !== "undefined"
            ) {
                return;
            }

            // a route is expected.
            viewState = { view: VIEW_ROUTES };

            routingApi.getRoute(
                {
                    locations: [location1.location, location2.location],
                    profile: profile,
                    alternatives: locations.length == 2 ? 2 : 1,
                },
                (e) => {
                    if (routeSequence != sequenceNumber) {
                        console.warn(
                            `Routing was too slow, number at ${routeSequence}, but response has ${sequenceNumber}`
                        );
                        return;
                    }

                    if (e[profile + "0"]) {
                        // route with alternative, we have only one segment here with a possible altnerative.
                        const newRoutes: any[] = [
                            {
                                segments: [e[profile + "0"]],
                                description: "Aangeraden route",
                            },
                        ];

                        for (var a = 1; a <= 3; a++) {
                            var alternative = e[profile + `${a}`];
                            if (alternative) {
                                newRoutes.push({
                                    segments: [alternative],
                                    description: "Alternatieve route",
                                });
                            }
                        }

                        routes = newRoutes;
                    } else {
                        // a route that is a missing segment.
                        if (typeof routes[0] === "undefined") {
                            routes[0] = {
                                description: "Aangeraden route",
                                segments: [],
                            };
                        }
                        routes[0].segments[segment] = e;
                        routes = [...routes];
                    }
                }
            );
        });
    }

    $: if (typeof locations !== "undefined") {
        getRoutes();
    }

    let lastProfile = profile;
    $: if (typeof profile !== "undefined" && lastProfile != profile) {
        routes.forEach((r) => {
            if (typeof r !== "undefined") {
                r.segments = [];
            }
        });

        lastProfile = profile;
        getRoutes();
    }

    function onLocationFocus(e: CustomEvent<number>): void {
        let placeholder: string = "Via";
        if (e.detail === locations.length - 1) {
            placeholder = "Naar";
        } else if (e.detail == 0) {
            placeholder = "Van";
        }

        if (e.detail < locations.length) {
            const location = locations[e.detail];
            if (typeof locations !== "undefined") location.description = "";
        }

        locations = [...locations];
        viewState = {
            view: VIEW_SEARCH,
            search: {
                location: e.detail,
                placeholder: placeholder,
            },
        };
    }

    function onLocationInput(
        e: CustomEvent<{ i: number; value: string }>
    ): void {
        const searchString: string = e.detail.value;
        viewState.search.location = e.detail.i;
        if (!searchString || searchString.length == 0) {
            searchResults = {
                location: e.detail.i,
                results: [],
            };
            return;
        }

        // TODO: include current map center.
        geocoder.geocode({ string: searchString }, (results) => {
            searchResults = {
                location: e.detail.i,
                results: results,
            };
        });
    }

    function onLocationClose(e: CustomEvent<number>): void {
        removeLocation(e.detail);
    }

    function onLocationAdd(): void {
        locationId++;
        const location: Location = {
            id: locationId,
            isUserLocation: false,
        };

        locations.push(location);

        locations = [...locations];
    }