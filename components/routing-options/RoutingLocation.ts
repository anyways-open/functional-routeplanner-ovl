import { Marker } from "mapbox-gl";

export interface RoutingLocation {
    id: number, 
    isUserLocation: boolean, 
    marker?: Marker, 
    location?: { lng: number; lat: number},
    name?: string
}