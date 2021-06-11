import { IControl, Map, MapDataEvent } from "mapbox-gl";
import './*.css';
import partials from './partials/*.html';
import assets from './assets/*.svg';

export class HelpButton implements IControl {
    map: Map;
    element: HTMLElement;
    navElement: HTMLElement;
    openEvent: () => void;

    constructor() {
    }

    on(event: "open", handler: () => void): void {
        if (event == "open") {
            this.openEvent = handler;
        }
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this.navElement = document.createElement("nav");
        this.navElement.classList.add("help-button-control");
        this.navElement.addEventListener("click", () => this.openEvent());
        this.element.appendChild(this.navElement);

        const helpIcon = document.createElement("img");
        helpIcon.src = assets["info"];
        this.navElement.appendChild(helpIcon);

        return this.element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: mapboxgl.Map): void {

    }
}