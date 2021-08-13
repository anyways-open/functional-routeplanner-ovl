export interface Location {
    id: number,
    description?: string,
    isUserLocation?: boolean,
    location?: { lng: number; lat: number }
}