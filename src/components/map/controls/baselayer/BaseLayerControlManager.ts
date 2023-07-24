import type { AnyLayer, AnySourceImpl, IControl, Map } from "maplibre-gl";
import type { BaseLayerControlOptions } from "./BaseLayerControlOptions";
import type maplibregl from "maplibre-gl";

export class BaseLayerControlManager implements IControl {
    private readonly _imagerySourceName: string;
    private readonly _imageryImage: string;
    private readonly _mapImage: string;
    private readonly _layerColors: any = {};
    private readonly _map: Map;
    private readonly _element: HTMLElement;

    private toggleEvent: (on: boolean) => void;

    _layerColorsInitialized: boolean = false;
    _active = false;

    _imagerySource: AnySourceImpl;
    _imageryLayer: AnyLayer;
    _backgroundLayer: AnyLayer;

    constructor(element: HTMLElement, map: Map, options: BaseLayerControlOptions) {
        this._map = map;
        this._element = element;

        this._imagerySourceName = options.source;
        this._imageryImage = options.images.imagery;
        this._mapImage = options.images.map;
    }

    onAdd(_: maplibregl.Map): HTMLElement {
        return this._element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(_: maplibregl.Map): void {

    }

    public activateImagery(): void {
        this._configure();

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

        this._active = true;
    }

    public deActivateImagery(): void {
        this._configure();
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

        this._active = false;
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
                    this._map.setPaintProperty(layer.id, "line-color", this._layerColors[layer.id]);
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

    private _configure() {

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

            if (!this._layerColorsInitialized) {
                if (layer.type === "line" &&
                    layer["source-layer"] === "transportation") {
                        
                    this._layerColors[layer.id] = this._map.getPaintProperty(layer.id, "line-color");
                }
            }
        }
        this._layerColorsInitialized = true;
    }
}
