import { Marker } from "mapbox-gl";

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

    public isEmpty(): boolean {
        return !this.location && !this.marker;
    }

    public getLngLat(): { lng: number; lat: number} {
        if (this.marker) return this.marker.getLngLat();

        return this.location;
    }
}