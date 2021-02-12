START:

1: No URL params, empty init.

1.1: Location not set: 
    ACTION: Map initializes on East-Flanders.

    1.1.1: User clicks on map or uses search to find location.
        ACTION: The origin location is shown on the map with a marker.
        ACTION: The routing control expands into full view, it contains 1 location, the origin.

    1.1.2: User clicks on map or uses destination field to find location.
        ACTION: The destination location is shown on the map with a marker.
        ACTION: A route is calculated to the destination using the default profile.

1.2: Location on:
    ACTION: Map initializes on East-Flanders, then zoom to user location.

    1.2.1: User clicks on map or uses search to find location.
        ACTION: The destination location is shown on the map with a marker.
        ACTION: A route is calculated to the destination using the default profile.
        ACTION: The routing control expands into full view, it contains 2 locations.

2: URL params
2.1: Map view in parameters.
    ACTION: Zoom map to url defined location, ignore current location.
2.2: Route in parameters.
    2.2.1: Start location set.
        2.2.1.1: Start location is close to current location.
            ACTION: Use route from parameters. Set marker from location to current location.
        2.2.1.2: Start location not close to current location.
            ACTION: Use route from parameters. Set marker to from location from parameters.

