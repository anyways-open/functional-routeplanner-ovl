export interface IForwardResult {
    provider: string,
    description: string,
    location: { lng: number; lat: number},
    type: string,
    score: number,
    raw: any
}