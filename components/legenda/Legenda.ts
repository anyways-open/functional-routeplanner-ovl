import { IControl, Map, MapDataEvent } from "mapbox-gl";
import "./*.css";
import ComponentHtml from "*.html";

export class LegendaControl {
    map: Map;
    element: HTMLElement;
    legendaDiv: HTMLElement;
    closeButton: HTMLElement;

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

        this.closeButton = document.createElement("div");
        this.closeButton.className = "btn-close";
        this.closeButton.innerHTML = ComponentHtml["closeImgLegenda"];
        this.closeButton.addEventListener("click", () => { this.hide();});
        this.legendaDiv.appendChild(this.closeButton);

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