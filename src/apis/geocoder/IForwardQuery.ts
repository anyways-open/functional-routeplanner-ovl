export interface IForwardQuery { 
    string: string, 
    location?: { lon: number, lat: number },
    bounds?: [number,number,number,number]
}