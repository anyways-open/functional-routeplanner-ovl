import { IControl, Map, MapDataEvent } from "mapbox-gl";
import { LayerConfig } from "./LayerConfig";
import './*.css';
import { UrlParamHandler } from "../url-hash/URLHashHandler";

export class LayerControl implements IControl {
    layers: { enabled: boolean, visible: boolean, config: LayerConfig }[] = []; 
    map: Map;
    element: HTMLElement;
    navElement: HTMLElement;
    urlHasher: UrlParamHandler;
    private readonly urlHasherClientId = "LayersControl";

    constructor(layers: LayerConfig[], urlHasher: UrlParamHandler) {
        layers.forEach(lc => {
            this.layers.push({
               enabled: lc.enabled,
               visible: lc.visible,
               config: lc 
            });
        });

        this.urlHasher = urlHasher;
        this.urlHasher.onUpdated(this._onUrlHashData);
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this.navElement = document.createElement("nav");
        this.navElement.classList.add("layer-control");
        this.element.appendChild(this.navElement);

        // build initial layers
        this._buildLayers();

        // apply url params after init.
        this._onUrlHashData(this.urlHasher.getState());
        this.layers.forEach(l => {
            l.config.layers.forEach(lid => {
                this.toggleLayer(lid, l.config.visible);
            });
        });
        
        // hook up events.
        this.map.on("data", (e) => this._onMapData(e));

        return this.element;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
    onRemove(map: mapboxgl.Map): void {

    }

    private _onMapData(e: MapDataEvent) {
        //if (e.type != "style") return;

        this._buildLayers();
    }

    private toggleLayer(layerId: string, visible: boolean) {
        const layer = this.map.getLayer(layerId);

        //if (typeof layer == "undefined") return;

        if (visible) {
            this.map.setLayoutProperty(layerId, "visibility", "visible");
        } else {
            this.map.setLayoutProperty(layerId, "visibility", "none");
        }
    }

    private _buildLayers() {
        this.navElement.innerHTML = "";

        this.layers.forEach(l => {
            if (!l.enabled) {
                l.config.layers.forEach(lid => {
                    this.toggleLayer(lid, false);
                });
                return;
            }

            const layerButton = document.createElement("a");
            layerButton.href.link("#");
            layerButton.classList.add("btn");
            layerButton.type = "button";

            if (l.visible) {
                layerButton.classList.add("active");
            }

            // call build layer function.
            if (l.config.build) {
                l.config.build(layerButton, l.config);
            } else {
                layerButton.innerHTML = l.config.name;
            }
            layerButton.addEventListener("click", e => {
                if (l.visible) {
                    l.config.layers.forEach(lid => {
                        this.toggleLayer(lid, false);
                    });
                    l.visible = false;
                    layerButton.classList.remove("active");
                } else {
                    l.config.layers.forEach(lid => {
                        this.toggleLayer(lid, true);
                    });
                    l.visible = true;
                    layerButton.classList.add("active");
                }

                this._updateUrlHashData();
            });
            this.layers.forEach(l => {
                l.config.layers.forEach(lid => {
                    this.toggleLayer(lid, l.visible);
                });
            });

            this.navElement.appendChild(layerButton);
        });
    }

    private _onUrlHashData(state: any): void {
        if (!state.layers) return;
        
        const layers = state.layers.split("|");

        layers.forEach(l => {
            if (!l) return;
            if (l.length != 3) return;

            const id = l.substr(0,2);

            const i = this.layers.findIndex(x => x.config.id == id);
            if (i == -1) return;

            const s = Number(l.substr(2,1));
            if (s == 0) {
                this.layers[i].enabled = false;
                this.layers[i].visible = false;
            } else if (s == 1) {
                this.layers[i].enabled = true;
                this.layers[i].visible = true;
            } else if (s == 2) {
                this.layers[i].enabled = true;
                this.layers[i].visible = false;
            }
        });

        console.log(layers);
        console.log(this.layers);

        this._buildLayers();
        this.layers.forEach(l => {
            l.config.layers.forEach(lid => {
                this.toggleLayer(lid, l.config.visible);
            });
        });
    }

    private _updateUrlHashData(): void {
        if (!this.urlHasher) return;

        // every layer can have four states:
        // visible: the layer data is visible on the map.
        // invisble: the layer data is not visible on the map.
        // disabled: the layer button is not shown.
        // enabled: the layer button is shown, the user can change the layers' visibility.
    
        // the states are translated into url parameters as follows:
        // no entry: layer is in default state.
        // ID0: layer is disabled.
        // ID1: layer is visible and button enabled.
        // ID2: layer is not visible but button enabled.

        let layers: string[] = [];
        this.layers.forEach(l => {
            if (l.enabled != l.config.enabled) {
                console.log("Enabled differs: " + l.config.id);
                if (l.enabled) {
                    if (l.visible) {
                        layers.push(`${l.config.id}1`);
                    } else {
                        layers.push(`${l.config.id}2`);
                    }
                } else {
                    layers.push(`${l.config.id}0`);
                }
                return;
            }
            if (l.enabled && l.visible != l.config.visible) {
                if (l.visible) {
                    layers.push(`${l.config.id}1`);
                } else {
                    layers.push(`${l.config.id}2`);
                }
            }
        });

        this.urlHasher.update({ layers: layers.join("|") });
    }
}
