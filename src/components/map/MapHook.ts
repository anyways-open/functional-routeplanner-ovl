export class MapHook {
    public resize: () => void;
    public flyTo: (center: {lat: number, lng: number}) => void;
}