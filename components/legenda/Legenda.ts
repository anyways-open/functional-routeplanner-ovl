import { IControl, Map, MapDataEvent } from "mapbox-gl";
import './*.css';
import ComponentHtml from "*.html";

export class LegendaControl {
    map: Map;
    element: HTMLElement;
    navElement: HTMLElement;

    constructor() { 

    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        const legendaDiv = document.createElement("div");
        legendaDiv.className = "legenda";
        legendaDiv.innerHTML  = ComponentHtml["Legenda"];
        document.body.appendChild(legendaDiv);

        return this.element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: mapboxgl.Map): void {

    }
}