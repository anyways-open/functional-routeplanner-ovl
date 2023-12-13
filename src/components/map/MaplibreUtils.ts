import type { Map } from "maplibre-gl";

export class MaplibreUtils {
    /**
     * Loads the specified URL as image and returns it.
     * If 'saveAs' is specified, this will be saved into the maplibre-map in order to use in the style specs
     * @param map
     * @param url
     * @param saveAs
     * @private
     */
    public static async loadImage(map: Map, url: string, saveAs?: string): Promise<HTMLImageElement
        | ArrayBufferView
        | { width: number; height: number; data: Uint8Array | Uint8ClampedArray }
        | ImageData
        | ImageBitmap> {
        return new Promise((resolve, reject) => map.loadImage(url, (e, i) => {
            if (e) {
                reject(e)
                return
            }
            if(saveAs){
                map.addImage(saveAs, i);
            }
            console.log("Image ",url,"loaded")
            resolve(i)
        }))
    }
}