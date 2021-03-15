import { AnyLayer, AnySourceImpl, IControl, Map, MapDataEvent } from "mapbox-gl";
import './*.css';

export class BaseLayerControl implements IControl {
    readonly _imagerySourceName: string;
    readonly _imageryImage: string;
    readonly _mapImage: string;

    private toggleEvent: (on: boolean) => void;

    _map: Map;
    _element: HTMLElement;
    _navElement: HTMLElement;
    _active = false;

    _imagerySource: AnySourceImpl;
    _imageryLayer: AnyLayer;
    _backgroundLayer: AnyLayer;

    _imageryElement: HTMLImageElement;
    _mapElement: HTMLImageElement;

    constructor(options: {
        source: string,
        images: {
            imagery: string,
            map: string
        }
    }) {
        this._imagerySourceName = options.source;
        this._imageryImage = options.images.imagery;
        this._mapImage = options.images.map;
    }

    on(event: "toggle", handler: (on: boolean) => void): void {
        if (event == "toggle") {
            this.toggleEvent = handler;
        }
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this._map = map;

        // create element.
        this._element = document.createElement("div");
        this._element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this._navElement = document.createElement("nav");
        this._navElement.classList.add("base-layers");
        this._element.appendChild(this._navElement);

        this._imageryElement = document.createElement("img");
        if (this._active) this._imageryElement.classList.add("base-layer-hidden");
        this._imageryElement.src = this._imageryImage;
        this._imageryElement.addEventListener("click", () => this.onClickImagery())
        this._navElement.appendChild(this._imageryElement);

        this._mapElement = document.createElement("img");
        if (!this._active) this._mapElement.classList.add("base-layer-hidden");
        this._mapElement.addEventListener("click", () => this.onClickMap())
        this._mapElement.src = this._mapImage;
        this._navElement.appendChild(this._mapElement);

        // hook up events.
        this._map.on("data", (e) => this._onMapData(e));

        return this._element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: mapboxgl.Map): void {

    }

    toggle(): void {
        if (this._active) {
            this.deActivateImagery();
        } else {
            this.activateImagery();
        }
    }

    activateImagery(): void {
        // make fills visible.
        this.setFillVisibility(false);
        this.setRoadColor(false);
        this.setLabels(false);

        // show imagery.
        if (this._imageryLayer != null) {
            this._map.setLayoutProperty(this._imageryLayer.id, "visibility", "visible");
        }

        // hide background.
        if (this._backgroundLayer != null) {
            this._map.setLayoutProperty(this._backgroundLayer.id, "visibility", "none");
        }

        if (this.toggleEvent) this.toggleEvent(true);

        // hide/show buttons.
        this._imageryElement.classList.value = "";
        this._imageryElement.classList.add("base-layer-hidden");
        this._mapElement.classList.value = "";

        this._active = true;
    }

    deActivateImagery(): void {
        // make fills visible.
        this.setFillVisibility(true);
        this.setRoadColor(true);
        this.setLabels(true);

        // show background.
        if (this._backgroundLayer != null) {
            this._map.setLayoutProperty(this._backgroundLayer.id, "visibility", "visible");
        }

        // hide imagery.
        if (this._imageryLayer != null) {
            this._map.setLayoutProperty(this._imageryLayer.id, "visibility", "none");
        }

        if (this.toggleEvent) this.toggleEvent(false);

        // hide/show buttons.
        this._mapElement.classList.value = "";
        this._mapElement.classList.add("base-layer-hidden");
        this._imageryElement.classList.value = "";

        this._active = false;
    }

    private onClickImagery(): void {
        this.activateImagery();
    }

    private onClickMap(): void {
        this.deActivateImagery();
    }

    private setLabels(visible: boolean): void {
        const style = this._map.getStyle();
        for (let l = 0; l < style.layers.length; l++) {
            const layer = style.layers[l];
            if (layer.type === "symbol" &&
                (layer["source-layer"] === "transportation_name" || 
                 layer["source-layer"] === "place")) {
                if (!layer.layout) {
                    layer.layout = {};
                }
                if (visible) {
                    this._map.setPaintProperty(layer.id, "text-color", "#000");
                    this._map.setPaintProperty(layer.id, "text-halo-color", "hsl(0, 0%, 100%)");
                } else {
                    this._map.setPaintProperty(layer.id, "text-color", "#fff");
                    this._map.setPaintProperty(layer.id, "text-halo-color", "rgba(0,0,0,0.4)");
                }
            }
        }
    }

    private setRoadColor(visible: boolean): void {
        const style = this._map.getStyle();
        for (let l = 0; l < style.layers.length; l++) {
            const layer = style.layers[l];
            if (layer.type === "line" &&
                layer["source-layer"] === "transportation") {
                if (!layer.layout) {
                    layer.layout = {};
                }
                if (visible) {
                    this._map.setPaintProperty(layer.id, "line-color", "#fff");
                } else {
                    this._map.setPaintProperty(layer.id, "line-color", "#000");
                }
            }
        }
    }

    private setFillVisibility(visible: boolean): void {
        const style = this._map.getStyle();
        for (let l = 0; l < style.layers.length; l++) {
            const layer = style.layers[l];
            if (layer.type === "fill") {
                if (!layer.layout) {
                    layer.layout = {};
                }
                if (visible) {
                    this._map.setLayoutProperty(layer.id, "visibility", "visible");
                } else {
                    this._map.setLayoutProperty(layer.id, "visibility", "none");
                }
            }
        }
    }

    private _onMapData(e: MapDataEvent) {
        if (e.dataType != "style") return;

        // make sure imagery source is there.
        if (this._imagerySource == null) {
            this._imagerySource = this._map.getSource(this._imagerySourceName);

            if (this._imagerySource == null) {
                return;
            }
        }

        // make sure imagery layer is there.
        if (this._imageryLayer == null) {
            this._imageryLayer = this._map.getLayer("background-imagery");
            if (this._imageryLayer == null) {
                this._map.addLayer({
                    "id": "background-imagery",
                    "type": "raster",
                    "source": this._imagerySourceName,
                    "minzoom": 0,
                    "maxzoom": 20,
                    "layout": {
                        "visibility": "none"
                    }
                }, "background");
                this._imageryLayer = this._map.getLayer("background-imagery");
            }
        }     
        
        // make sure the background layer is found.
        const style = this._map.getStyle();
        for (let l = 0; l < style.layers.length; l++) {
            const layer = style.layers[l];
            if (layer.id === "background-imagery") continue;

            if (layer.type === "background") {
                this._backgroundLayer = layer;
            }
        }

        if (this._active) {
            this.activateImagery();
        } else {
            this.deActivateImagery();
        }
    }
}
