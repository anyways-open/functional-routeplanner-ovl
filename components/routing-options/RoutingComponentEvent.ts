import { Marker } from "mapbox-gl";
import { RoutingComponent } from "./RoutingComponent";

export interface RoutingComponentEvent {
    component?: RoutingComponent
    marker?: Marker
    route?: any,
    profile?: string
}