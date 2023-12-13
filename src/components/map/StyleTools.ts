import type { FilterSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";

export class StyleTools {

    public static removeLayers(style: StyleSpecification, layerIds: string[]) {
        const origLayers = style.layers
        for (const id of layerIds) {
            const index = origLayers.findIndex(l => l.id === id)
            if (index < 0) {
                continue // already removed
            }
            origLayers.splice(index, 1)
        }
    }

    public static addLayer(style: StyleSpecification, layer: LayerSpecification, beforeLayer?: string) {
        const i = style.layers.findIndex(x => x.id == beforeLayer);
        if (i == -1) {
            style.layers.push(layer);
        } else {
            style.layers.splice(i, 0, layer);
        }
    }

    public static IsOnewayFilter(): FilterSpecification {
        return ["any",
            ["==", "anyways:oneway", 1], // this tag overrrules all others.
            ["all", // if there is no anyways tag check for a regular oneway.
                ["!has", "anyways:oneway"],
                ["==", "oneway", 1]
            ]
        ];
    }

    public static IsOnewayReverseFilter(): FilterSpecification {
        return ["any",
            ["==", "anyways:oneway", -1], // this tag overrrules all others.
            ["all", // if there is no anyways tag check for a regular oneway.
                ["!has", "anyways:oneway"],
                ["==", "oneway", -1]
            ]
        ];
    }
}