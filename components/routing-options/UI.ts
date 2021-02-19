import ComponentHtml from "*.html";

export class UI {
    
    private element: HTMLElement;
    private locationsContainer: HTMLElement;
    private locationElements: HTMLElement[] = [];

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
    }

    count(): number {
        return this.locationElements.length;
    }

    addLocation(type: "via" | "user" | "end" | "start", value: string): void {
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        this.locationElements.push(locationContainer);
        
        this._buildLocationContent(locationContainer, type, value, this.locationElements.length == 1);
    }

    updateLocation(idx: number, type: "via" | "user" | "end" | "start", value: string): void {
        const locationContainer = this.locationElements[idx];
        locationContainer.innerHTML = "";
        
        this._buildLocationContent(locationContainer, type, value, idx == 0);
    }

    removeLocation(idx: number): void {
        const locationContainer = this.locationElements[idx];
        locationContainer.remove();

        // remove locations.
        this.locationElements.splice(idx, 1);
    }

    insertLocation(idx: number, type: "via" | "user" | "end" | "start", value: string): void {

        // remove all after index.
        for (let i = idx; i < this.locationElements.length; i++) {
            this.locationElements[i].remove();
        }

        // insert location.
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        this.locationElements.splice(idx, 0, locationContainer);
        
        this._buildLocationContent(locationContainer, type, value, idx == 0);

        // add all after index.
        for (let i = idx + 1; i < this.locationElements.length; i++) {
            this.locationsContainer.append(this.locationElements[i]);
        }
    }

    private _buildLocationContent(container: HTMLElement, type: "via" | "user" | "end" | "start", value: string, menu?: boolean) {
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
    }
}