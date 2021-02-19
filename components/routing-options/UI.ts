import ComponentHtml from "*.html";

export class UI {
    
    private element: HTMLElement;
    private locationsContainer: HTMLElement;
    private locationElements: { root: HTMLElement, input: HTMLInputElement }[] = [];

    private routeDetailsElement: HTMLElement;
    private routeElements: HTMLElement[] = [];

    constructor(element: HTMLElement) {
        this.element = element;
    }

    build(): void {        
        const element = document.createElement("div");
        element.className = "routing-component";

        this.element.append(element);
        
        const locationsContainer = document.createElement("div");
        locationsContainer.id = "routing-component-locations-container";
        locationsContainer.className = "routing-component-locations container py-2";
        element.append(locationsContainer);
        this.locationsContainer = locationsContainer;

        const profilesContainer = document.createElement("div");
        profilesContainer.className = "profiles-container"
        const profileSelection = ComponentHtml["profileSelection"];
        profilesContainer.innerHTML = profileSelection;
        element.append(profilesContainer);

        // const routesContainer = document.createElement("div");
        // routesContainer.className = "routes-container"
        // const routeDetails = ComponentHtml["routeDetails"];
        // routesContainer.innerHTML = routeDetails;
        // element.append(routesContainer);
    }

    count(): number {
        return this.locationElements.length;
    }

    routeCount(): number {
        return this.routeElements.length;
    }

    addRoute(description: string, stats: { distance: number, time: number }): void {
        if (!this.routeDetailsElement) {
            const routeDetailsElement = document.createElement("div");
            routeDetailsElement.className = "container";
            this.element.append(routeDetailsElement);
            this.routeDetailsElement = routeDetailsElement;
        }

        const routeDetail = document.createElement("div");
        routeDetail.className = "route-detail row my-1";
        this.routeDetailsElement.append(routeDetail);
        this.routeElements.push(routeDetail);

        this._buildRouteDetailContent(routeDetail, description, stats);
    }

    updateRoute(idx: number, description: string, stats: { distance: number, time: number }): void {
        const routeDetail = this.routeElements[idx];
        routeDetail.innerHTML = "";

        this._buildRouteDetailContent(routeDetail, description, stats);
    }

    addLocation(type: "via" | "user" | "end" | "start", value: string): void {
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        
        const i = this._buildLocationContent(locationContainer, type, value, this.locationElements.length == 1);
        this.locationElements.push({ root: locationContainer, input: i});
    }

    updateLocation(idx: number, type: "via" | "user" | "end" | "start", value: string): void {
        const locationContainer = this.locationElements[idx].root;
        locationContainer.innerHTML = "";
        
        this.locationElements[idx].input = this._buildLocationContent(locationContainer, type, value, idx == 0);
    }

    updateLocationName(idx: number, value: string): void {
        this.locationElements[idx].input.value = value;
    }

    removeLocation(idx: number): void {
        const locationContainer = this.locationElements[idx].root;
        locationContainer.remove();

        // remove locations.
        this.locationElements.splice(idx, 1);
    }

    insertLocation(idx: number, type: "via" | "user" | "end" | "start", value: string): void {

        // remove all after index.
        for (let i = idx; i < this.locationElements.length; i++) {
            this.locationElements[i].root.remove();
        }

        // insert location.
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        const i = this._buildLocationContent(locationContainer, type, value, idx == 0);
        this.locationElements.splice(idx, 0, { root: locationContainer, input: i});

        // add all after index.
        for (let i = idx + 1; i < this.locationElements.length; i++) {
            this.locationsContainer.append(this.locationElements[i].root);
        }
    }

    private _buildLocationContent(container: HTMLElement, type: "via" | "user" | "end" | "start", value: string, menu?: boolean): HTMLInputElement {
        menu ??= false;

        // construct icon an add.
        const menuIcon = document.createElement("div");
        if (menu) {
            menuIcon.innerHTML = ComponentHtml["menuButton"];
        } else {
            menuIcon.innerHTML = ComponentHtml["menuPlaceholder"];
        }
        container.append(menuIcon);

        // construct input field and search icon.
        const locationInputGroup = document.createElement("div");
        locationInputGroup.className = "input-group location-input";
        container.append(locationInputGroup);

        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control border-0";
        input.value = value;
        locationInputGroup.append(input);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-light border-0";
        button.innerHTML = ComponentHtml["searchImg"];
        locationInputGroup.append(button);

        // construct icon an add.
        const locationIcon = document.createElement("div");
        if (type == "user") {
            locationIcon.innerHTML = ComponentHtml["locationDot"];
        } else if (type == "via" || type == "start") {
            locationIcon.innerHTML = ComponentHtml["locationVia"];
        } else {
            locationIcon.innerHTML = ComponentHtml["locationMarker"];
        }
        container.append(locationIcon);

        return input;
    }

    private _buildRouteDetailContent(container: HTMLElement, description: string, stats: { distance: number, time: number }) {
        const descriptionElement = document.createElement("div");
        descriptionElement.className = "col-6 py-3";
        descriptionElement.innerHTML = description;
        container.append(descriptionElement);

        const statsElement = document.createElement("div");
        statsElement.className = "col-4 py-3";
        container.append(statsElement);

        const distanceElement = document.createElement("div");
        statsElement.append(distanceElement);

        const distanceStrong = document.createElement("strong");
        distanceStrong.innerHTML = this._formatDistance(stats.distance);
        distanceElement.append(distanceStrong);

        const timeElement = document.createElement("div");
        statsElement.append(timeElement);

        const timeStrong = document.createElement("strong");
        timeStrong.innerHTML = this._formatTime(stats.time);
        timeElement.append(timeStrong);

        // construct icon and add.
        const bicycleIcon = document.createElement("div");
        bicycleIcon.className = "col-2 py-3";
        bicycleIcon.innerHTML = ComponentHtml["routeBicycle"];
        container.append(bicycleIcon);
    }

    private _formatDistance(distance: number) {
        if (distance < 1000) {
            return "" + Math.round(distance) + " m";
        }
        return "" + ((distance / 1000).toFixed(2) + " km").replace(".", ",");
    }

    private _formatTime(time: number) {
        if (time < 60) {
            return `< 1 min`;
        }
        if (time < 3600) {
            return `${Math.round(time / 60)} min`;
        }
        const h = Math.floor(time / 3600);
        const m = Math.floor((time % 3600) / 60);
        return `${h} uur, ${m}`;
    }
}