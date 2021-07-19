import { IControl, Map } from "mapbox-gl";
import Partials from "./partials/*.html";

export class MobileControl {
    private map: Map;

    /**
     * IControl implementation: Called when the control is added to the map.
     * 
     * @param map The map.
     */
    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        const element = document.createElement("div");
        element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        element.innerHTML = Partials["start"];

        return element;
    }

    /**
     * IControl implementation: Called when the control is removed from the map.
     * 
     * @param map The map.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
    onRemove(map: mapboxgl.Map): void {

    }

    /**: { properties: { distance: string; }; }
     * IControl implementation: Gets the default position.
     */
    getDefaultPosition?: () => string;
}