import { LngLatLike } from "mapbox-gl";
import { RoutingComponent } from "../RoutingComponent";

export interface LocationEvent{
    component?: RoutingComponent
    id: number,
    location: LngLatLike
}