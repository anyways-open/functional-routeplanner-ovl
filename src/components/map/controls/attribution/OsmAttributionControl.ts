import maplibregl, {AttributionControl, Map} from 'maplibre-gl';
import type {AttributionControlOptions} from './AttributionControlOptions';

export class OsmAttributionControl extends AttributionControl {
    readonly elementId: string;
    readonly path: string;
    map: Map;

    static defaultElementId: string = "attribution-osm-edit-button";
    static defaultPath: string = "https://www.openstreetmap.org/edit";

    constructor(options?: AttributionControlOptions) {        
        super(OsmAttributionControl.buildOptions(options));

        this.elementId = OsmAttributionControl.defaultElementId;
        this.path = OsmAttributionControl.defaultPath;

        if (typeof options != "undefined" &&
            typeof options.editButton != "undefined") {

            this.elementId = options.editButton.elementId || this.elementId;
            this.path = options.editButton.path || this.path;
        }
    }

    static buildOptions(options?: AttributionControlOptions): { compact?: boolean; customAttribution?: string | string[]; } {

        // build button options.
        var buttonOptions: { elementId?: string, path?: string, svg?: string } = {
            elementId: OsmAttributionControl.defaultElementId,
            path: OsmAttributionControl.defaultPath,
            svg: "assets/icons/edit.svg"
        };
            
        if (typeof options != "undefined" &&
            typeof options.editButton != "undefined") {

            buttonOptions.elementId = options.editButton.elementId || buttonOptions.elementId;
            buttonOptions.path = options.editButton.path || buttonOptions.path;
            buttonOptions.svg = options.editButton.svg || buttonOptions.svg;
        }

        // build super options 
        var superOptions: { compact?: boolean; customAttribution?: string[]; } = {
            customAttribution: []
        };

        if (typeof options != "undefined"){
            if (typeof options.customAttribution == "string") {
                superOptions.customAttribution.push(options.customAttribution);
            } else {
                options.customAttribution.forEach(a => {
                    superOptions.customAttribution.push(a);
                })
            }         
            
            superOptions.compact = options.compact || superOptions.compact;
        }

        superOptions.customAttribution.push(
            `<a id="${ buttonOptions.elementId }" href="${ buttonOptions.path }" target="_blank">
                <img src="${ buttonOptions.svg }"/>
            </a>`);

        return superOptions;
    }

    onAdd(map: maplibregl.Map): HTMLElement {
        this.map = map;

        // register move event to update edit location.
        this.map.on("load", (e) => { this._updateEditLocation(); });
        this.map.on("moveend", (e) => { this._updateEditLocation(); });

        return super.onAdd(map);
    }

    _updateEditLocation() {

        const element = <HTMLLinkElement> document.getElementById(this.elementId);
        if (typeof element == "undefined") return;

        element.href = `${ this.path }#map=${ this.map.getZoom() + 1 }/${ this.map.getCenter().lat }/${ this.map.getCenter().lng }`;
    }
}