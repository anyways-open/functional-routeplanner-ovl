import { MarkerEventData } from "./MarkerEventData";
import { RouteEventData } from "./RouteEventData";
import { RoutingComponent } from "./RoutingComponent";

export interface RoutingComponentEvent {
    component?: RoutingComponent
    marker?: MarkerEventData
    route?: RouteEventData,
    profile?: string
}