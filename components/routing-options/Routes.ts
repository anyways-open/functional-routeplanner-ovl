export class Routes {
    route?: { // the main route
        segments: GeoJSON.FeatureCollection<GeoJSON.Geometry>[]
    };
    alternatives?: { // the alternative route(s).
        segment: GeoJSON.FeatureCollection<GeoJSON.Geometry>, // an alternative route can have only 1 jump.
    }[];

    clear(): void {
        this.route = null;
        this.alternatives = null;
    }

    clearAt(startLocationIdx: number) {
        this.alternatives = null;

        if (this.route) {
            if (this.route.segments.length > startLocationIdx) {
                this.route.segments[startLocationIdx] = null;
            }
        }
    }

    clearForLocation(idx: number) {
        this.alternatives = null;

        if (this.route) {
            if (this.route.segments.length > idx - 1 && idx > 0) {
                this.route.segments[idx - 1] = null;
            }
            if (this.route.segments.length > idx) {
                this.route.segments[idx] = null;
            }
        }
    }

    removeForLocation(idx: number) {
        this.clearForLocation(idx);

        if (this.route) {
            this.route.segments.splice(idx, 1);
        }
    }

    insert(startLocationIdx: number, route?: GeoJSON.FeatureCollection<GeoJSON.Geometry>): void {
        this.route.segments.splice(startLocationIdx, 0, route);
    }

    set(startLocationIdx: number, route: GeoJSON.FeatureCollection<GeoJSON.Geometry>): void {
        if (!this.route) {
            this.route = {
                segments: []
            }
        }
        if (!this.route.segments) {
            this.route.segments = [];
        }

        const segments = this.route.segments;
        while(startLocationIdx >= segments.length) {
            segments.push(null);
        }
        segments[startLocationIdx] = route;
        this.route.segments = segments;
    }

    get(startLocationIdx: number): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
        if (this.route && this.route.segments && startLocationIdx < this.route.segments.length) {
            return this.route.segments[startLocationIdx];
        }
        return null;
    }

    setAlternative(alternativeIdx: number, route: GeoJSON.FeatureCollection<GeoJSON.Geometry>) {
        if (!this.alternatives) {
            this.alternatives = [];
        }

        while(alternativeIdx >= this.alternatives.length) {
            this.alternatives.push(null);
        }
        this.alternatives[alternativeIdx] ={ segment: route };
    }

    hasRoute(startLocationIdx: number): boolean {
        if (this.route && this.route.segments[startLocationIdx]) {
            return true;
        }
        return false;
    }

    getSegments(): GeoJSON.FeatureCollection<GeoJSON.Geometry>[] {
        return this.route.segments;
    }

    getAlternativeSegments(idx: number): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
        return this.alternatives[idx].segment;
    }

    alternativeCount(): number {
        if (!this.alternatives) return 0;

        return this.alternatives.length;
    }
}