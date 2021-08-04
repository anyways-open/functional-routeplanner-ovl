export interface LocationData {
    description?: string,
    type: "USER_LOCATION" | "END" | "VIA" | "START",
    location?: { lng: number; lat: number }
}