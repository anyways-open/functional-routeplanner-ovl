import { Marker } from "mapbox-gl";
import ComponentHtml from "*.html";

export class RoutingLocation {
    readonly id: number;
    readonly isUserLocation: boolean;
    private readonly marker?: Marker;
    private readonly location?: { lng: number; lat: number};
    name?: string;
    
    constructor(id: number, isUserLocation: boolean, marker?: Marker, location?: { lng: number; lat: number}, name?: string) {
        this.id = id;
        this.isUserLocation = isUserLocation;
        this.marker = marker;
        this.location = location;
        this.name = name;
    }

    public getMarker(): Marker {
        return this.marker;
    }

    public isMarker(): boolean {
        if (this.marker) return true;

        return false;
    }

    public updateMarkerType(type: "start" | "via" | "end") {
        const element = this.marker.getElement();

        element.innerHTML = "";
        if (type == "end") {
            element.className = "marker-destination mapboxgl-marker";
            element.innerHTML = ComponentHtml["marker"];
            this.marker.setOffset([0, -20]);
        } else {
            element.className = "marker-via mapboxgl-marker";
            element.innerHTML = ComponentHtml["via"];
            this.marker.setOffset([0, -5]);
        }
    }

    public isEmpty(): boolean {
        return !this.location && !this.marker;
    }

    public getLngLat(): { lng: number; lat: number} {
        if (this.marker) return this.marker.getLngLat();

        return this.location;
    }

    public setLngLat(location: { lng: number; lat: number}): void {
        if (this.marker) {
            this.marker.setLngLat(location);
        }
    }
}