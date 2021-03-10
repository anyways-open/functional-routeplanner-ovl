import ComponentHtml from "*.html";
import { ProfileConfig } from "./ProfileConfig";
import { UILocation } from "./UILocation";

export class UI {
    
    private element: HTMLElement;
    private locationsContainer: HTMLElement;
    private locationElements: { root: HTMLElement, input: HTMLInputElement }[] = [];

    private routeDetailsElement: HTMLElement;
    private routeElements: HTMLElement[] = [];

    private searchEvent: (idx: number) => void;
    private removeEvent: (idx: number) => void;
    private profileEvent: (profile: number) => void;

    private profiles: { config: ProfileConfig, element?: HTMLElement }[] = [];
    private profile = 0;

    constructor(element: HTMLElement, options: {
        profiles: ProfileConfig[],
        profile: number
    }) {
        this.element = element;

        this.profiles = options.profiles.map(x => { return { config: x }});
        this.profile = 0;
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
        // const profileSelection = ComponentHtml["profileSelection"];
        // profilesContainer.innerHTML = profileSelection;
        element.append(profilesContainer);

        const profilesToolbar = document.createElement("div");
        profilesToolbar.className = "btn-toolbar p-1 border-0";
        profilesContainer.append(profilesToolbar);

        const profileButtons = document.createElement("div");
        profileButtons.className = "btn-group";
        profilesToolbar.append(profileButtons);

        this.profiles.forEach((p, i) => {
            const profileButton = document.createElement("div");
            profileButton.className = "btn btn-profile border-0";
            profileButton.innerHTML = "<span>" +
                    "<img src=\"" + p.config.image + "\" />" +
                    "</span>" +
                "<span>" +
                        p.config.description +
                    "</span>";
            profileButton.addEventListener("click", () => this._selectProfile(i));
            profileButtons.append(profileButton);

            p.element = profileButton;
        });
        this.selectProfile(this.profile);

        // const routesContainer = document.createElement("div");
        // routesContainer.className = "routes-container"
        // const routeDetails = ComponentHtml["routeDetails"];
        // routesContainer.innerHTML = routeDetails;
        // element.append(routesContainer);
    }

    on(event: "search" | "remove" | "profile", handler: (idx: number) => void): void {
        if (event == "search") {
            this.searchEvent = handler;
        } else if (event == "remove") {
            this.removeEvent = handler;
        } else {
            this.profileEvent = handler;
        }
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

    removeRoute(idx: number): void {
        const routeDetail = this.routeElements[idx];
        routeDetail.remove();
        routeDetail.innerHTML = "";

        // remove locations.
        this.routeElements.splice(idx, 1);

        if (this.routeElements.length == 0) {
            this.routeDetailsElement.remove();
            this.routeDetailsElement = undefined;
        }
    }

    addLocation(location: UILocation): void {
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        
        const i = UI._buildLocationContent(locationContainer, location, this.locationElements.length == 0, () => {
            this.searchEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        }, () => {
            this.removeEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        });
        this.locationElements.push({ root: locationContainer, input: i});
    }

    updateLocation(idx: number, location: UILocation): void {
        const locationContainer = this.locationElements[idx].root;
        locationContainer.innerHTML = "";
        
        this.locationElements[idx].input = UI._buildLocationContent(locationContainer, location, idx == 0, () => {
            this.searchEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        }, () => {
            this.removeEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        });
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

    insertLocation(idx: number, location: UILocation): void {

        // remove all after index.
        for (let i = idx; i < this.locationElements.length; i++) {
            this.locationElements[i].root.remove();
        }

        // insert location.
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        const i = UI._buildLocationContent(locationContainer, location, idx == 0, () => {
            this.searchEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        }, () => {
            this.removeEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        });
        this.locationElements.splice(idx, 0, { root: locationContainer, input: i});

        // add all after index.
        for (let i = idx + 1; i < this.locationElements.length; i++) {
            this.locationsContainer.append(this.locationElements[i].root);
        }
    }

    selectProfile(p: number): void {
        this.profile = p;

        this.profiles.forEach((p, i) => {
            if (i == this.profile) {
                p.element.className = "btn btn-profile border-0 active";
            } else {
                p.element.className = "btn btn-profile border-0";
            }
        });
    }

    private _selectProfile(i: number) {
        if (this.profileEvent) {
            this.profileEvent(i);
        }
        this.selectProfile(i);
    }

    private static _buildLocationContent(container: HTMLElement, location: UILocation, 
        menu: boolean, search: () => void, remove?: () => void, ): HTMLInputElement {
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
        if (location.value) input.value = location.value;
        if (location.placeholder) input.placeholder = location.placeholder;
        locationInputGroup.append(input);

        const searchButton = document.createElement("button");
        searchButton.type = "button";
        searchButton.className = "btn btn-light border-0";
        searchButton.innerHTML = ComponentHtml["searchImg"];
        locationInputGroup.append(searchButton);
        searchButton.addEventListener("click", () => {
            search();
        });

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "btn btn-light border-0";
        closeButton.innerHTML = ComponentHtml["closeImg"];
        locationInputGroup.append(closeButton);
        closeButton.addEventListener("click", () => {
            remove();
        });

        // construct icon an add.
        const locationIcon = document.createElement("div");
        if (location.type == "user") {
            locationIcon.innerHTML = ComponentHtml["locationDot"];
        } else if (location.type == "via" || location.type == "start") {
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