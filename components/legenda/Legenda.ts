import { IControl, Map, MapDataEvent } from "mapbox-gl";
import './*.css';
import ComponentHtml from "*.html";

export class LegendaControl {
    map: Map;
    element: HTMLElement;
    legendaDiv: HTMLElement;

    constructor() { 

    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this.legendaDiv = document.createElement("div");
        this.legendaDiv.className = "legenda";
        this.legendaDiv.style.setProperty("display", "none");
        this.legendaDiv.innerHTML  = ComponentHtml["Legenda"];
        document.body.appendChild(this.legendaDiv);

        return this.element;
    }

    show() {
        this.legendaDiv.className = "legenda";
        this.legendaDiv.style.removeProperty("display");
    }

    hide() {
        this.legendaDiv.className = "legenda";
        this.legendaDiv.style.setProperty("display", "none");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: mapboxgl.Map): void {

    }
}