export interface Location {
    id: number,
    description?: string,
    backup?: Location,
    isUserLocation?: boolean,
    location?: { lng: number; lat: number }
}