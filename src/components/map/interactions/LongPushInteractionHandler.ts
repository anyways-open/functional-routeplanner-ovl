import type { EventData, Map, MapTouchEvent } from "maplibre-gl";

export class LongPushInteractionHandler {
    private readonly map: Map;
    private timeout: NodeJS.Timeout;
    private ev: MapTouchEvent & EventData;
    private callback: (ev: MapTouchEvent & EventData) => void;

    constructor(map: Map) {
        this.map = map;
    }

    public enable(callback: (ev: MapTouchEvent & EventData) => void): void {
        this.callback = callback;

        this.map.on("touchstart", (e) => this.onTouchStart(e));
        this.map.on("touchend", (e) => this.onTouchEnd(e));
        this.map.on("touchmove", (e) => this.onTouchMove(e));
    }

    private onTouchStart(ev: MapTouchEvent & EventData) {
        if (typeof this.timeout !== "undefined") {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        this.ev = ev;
        this.timeout = setTimeout(() => this.onLongTouch(), 250);
    }

    private onTouchMove(ev: MapTouchEvent & EventData) {
        if (Math.abs(ev.point.x - this.ev.point.x) < 5 &&
            Math.abs(ev.point.y - this.ev.point.y) < 5) {
            return;
        }

        if (typeof this.timeout !== "undefined") {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    private onTouchEnd(ev: MapTouchEvent & EventData) {
        if (typeof this.timeout !== "undefined") {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    private onLongTouch() {
        if (typeof this.timeout !== "undefined") {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        
        this.callback(this.ev);
    }
}