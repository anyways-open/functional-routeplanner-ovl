import type { IControl, Map, MapDataEvent } from "mapbox-gl";
import type { LayerConfig } from "./LayerConfig";

export class LayerControlManager implements IControl {
    map: Map;
    element: HTMLElement;

    constructor(element: HTMLElement, map: Map, layers: LayerConfig[]) {
        this.element = element;
        this.map = map;
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        return this.element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: mapboxgl.Map): void {

    }
}
