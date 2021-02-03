import { Profile } from "@anyways-open/routing-api";
import { RoutingComponent } from "../RoutingComponent";

export interface ProfilesEvent{
    component?: RoutingComponent
    profiles: Profile[]
}