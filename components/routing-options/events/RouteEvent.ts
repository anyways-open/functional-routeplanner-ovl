import { RoutingComponent } from "../RoutingComponent";

export interface RouteEvent{
    component?: RoutingComponent
    index: number,
    route: unknown // TODO: this is a geojson feature collection, how to describe properly?
}