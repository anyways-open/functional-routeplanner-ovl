import type { IControl, Map, MapDataEvent } from "maplibre-gl";
import type { LayerConfig } from "./LayerConfig";
import type maplibregl from "maplibre-gl";

export class LayerControlManager implements IControl {
    map: Map;
    element: HTMLElement;

    constructor(element: HTMLElement, map: Map, layers: LayerConfig[]) {
        this.element = element;
        this.map = map;
    }

    onAdd(map: maplibregl.Map): HTMLElement {
        this.map = map;

        return this.element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: maplibregl.Map): void {

    }
}
