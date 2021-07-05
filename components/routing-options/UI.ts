import ComponentHtml from "*.html";
import SvgAssets from "./assets/*.svg";
import GlobalSvgIconAssets from "../../assets/img/icons/*.svg";
import { ProfileConfig } from "./ProfileConfig";
import { UILocation } from "./UILocation";

export class UI {
    
    private element: HTMLElement;
    private locationsContainer: HTMLElement;
    private locationElements: { root: HTMLElement, input: HTMLInputElement }[] = [];
    private addLocationContainer: HTMLElement;

    private routeDetailsElement: HTMLElement;
    private routeElements: HTMLElement[] = [];

    private searchResultsElement: HTMLElement;

    private geocodedEvent: (idx: number) => void;
    private searchEvent: (idx: number) => void;
    private removeEvent: (idx: number) => void;
    private downloadEvent: (idx: number) => void;
    private profileEvent: (profile: number) => void;
    private routeEvent: (profile: number) => void;
    private menuEvent: (i: number) => void;
    private addEvent: (i: number) => void;

    private profiles: { config: ProfileConfig, element?: HTMLElement }[] = [];
    private profile = 0;

    private uiElement: HTMLElement;

    constructor(element: HTMLElement, options: {
        profiles: ProfileConfig[],
        profile: number
    }) {
        this.element = element;

        this.profiles = options.profiles.map(x => { return { config: x }});
        this.profile = 0;
    }

    build(): void {        
        this.uiElement = document.createElement("div");
        this.uiElement.className = "routing-component";

        this.element.append(this.uiElement);
        
        const locationsContainer = document.createElement("div");
        locationsContainer.id = "routing-component-locations-container";
        locationsContainer.className = "routing-component-locations container pt-2";
        this.uiElement.append(locationsContainer);
        this.locationsContainer = locationsContainer;

        const addLocationContainer = document.createElement("div");
        addLocationContainer.className = "routing-component-add-location container pb-2";
        this.uiElement.append(addLocationContainer);
        this.addLocationContainer = addLocationContainer;

        UI._buildAddLocation(this.addLocationContainer, () => this.addEvent(this.locationElements.length));

        const profilesContainer = document.createElement("div");
        profilesContainer.className = "profiles-container"
        this.uiElement.append(profilesContainer);

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
    }

    on(event: "geocoded" | "search" | "remove" | "profile" | "route" | "menu" | "download" | "add", handler: (idx: number) => void): void {
        if (event == "geocoded") {
            this.geocodedEvent = handler;
        } else if (event == "search") {
            this.searchEvent = handler;
        } else if (event == "remove") {
            this.removeEvent = handler;
        } else if (event == "route") {
            this.routeEvent = handler;
        } else if (event == "menu") {
            this.menuEvent = handler;
        } else if (event == "download") {
            this.downloadEvent = handler;
        } else if (event == "add") {
            this.addEvent = handler;
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

    addRoute(description: string, stats: { distance: number, time: number }, selected: boolean): void {
        if (!this.routeDetailsElement) {
            const routeDetailsElement = document.createElement("div");
            routeDetailsElement.className = "container";
            this.element.append(routeDetailsElement);
            this.routeDetailsElement = routeDetailsElement;
        }

        const routeDetail = document.createElement("div");
        this.routeDetailsElement.append(routeDetail);
        const i = this.routeElements.length;
        this.routeElements.push(routeDetail);
        routeDetail.addEventListener("click", () => this._selectRoute(i));

        this._buildRouteDetailContent(routeDetail, description, stats, selected, () => this.downloadEvent(i));
    }

    updateRoute(idx: number, description: string, stats: { distance: number, time: number }, selected: boolean): void {
        const routeDetail = this.routeElements[idx];
        routeDetail.innerHTML = "";

        this._buildRouteDetailContent(routeDetail, description, stats, selected, () => this.downloadEvent(idx));
    }

    removeRoute(idx: number): void {
        const routeDetail = this.routeElements[idx];
        routeDetail.innerHTML = "";
        routeDetail.remove();

        // remove locations.
        this.routeElements.splice(idx, 1);

        if (this.routeElements.length == 0) {
            this.routeDetailsElement.remove();
            this.routeDetailsElement = undefined;
        }
    }

    selectRoute(idx: number): void {
        this.routeElements.forEach((re, i) => {
            if (i === idx) {
                this._routeDetailContentSelect(re, true);
            } else {
                this._routeDetailContentSelect(re, false);
            }
        })
    }

    addLocation(location: UILocation): void {
        const locationContainer = document.createElement("div");
        locationContainer.className = "btn-toolbar border-0 pb-1";
        this.locationsContainer.append(locationContainer);
        
        const i = UI._buildLocationContent(locationContainer, location, this.locationElements.length == 0, () => {
            this.searchEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        }, () => {
            this.removeEvent(this.locationElements.findIndex(v => v.root == locationContainer));
        }, () => {
            this.menuEvent(-1);
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
        }, () => {
            this.menuEvent(-1);
        });
    }

    updateLocationName(idx: number, value: string): void {
        this.locationElements[idx].input.value = value;
    }

    getLocationValue(idx: number): string {
        return this.locationElements[idx].input.value;
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

    updateSearchResults(searchResults: {description: string, type: string, location: { lng: number; lat: number }}[], searchString: string) {
        if (!this.searchResultsElement) {
            const searchResultsElement = document.createElement("div");
            searchResultsElement.className = "container";
            this.element.append(searchResultsElement);
            this.searchResultsElement = searchResultsElement;
        }

        this.searchResultsElement.innerHTML = "";

        if (searchResults.length > 0) {
            this._hideRoutesDetails();
        } else {
            this._showRoutesDetails();
        }

        console.log("updateSearchResults");
        console.log(searchResults);
        searchResults.forEach((r, i) => {
            this._buildSearchResult(this.searchResultsElement, r, searchString, 
                () => {
                    this.geocodedEvent(i);
                });
        });
    }

    private _selectRoute(i: number) {
        if (this.routeEvent) {
            this.routeEvent(i);
        }

        this.selectRoute(i);
    }

    private _selectProfile(i: number) {
        if (this.profileEvent) {
            this.profileEvent(i);
        }
        this.selectProfile(i);
    }

    private _hideRoutesDetails() {
        if (!this.routeDetailsElement) return;
        
        if (this.routeDetailsElement.parentElement) {
            this.element.removeChild(this.routeDetailsElement);
        }
    }

    private _showRoutesDetails() {
        if (!this.routeDetailsElement) return;

        this.element.append(this.routeDetailsElement);
    }

    private static _buildAddLocation(container: HTMLElement, addAction: () => void): void {

        // construct icon an add.
        const toolbarDiv = document.createElement("div");
        toolbarDiv.className = "btn-toolbar border-0 pb-1";
        toolbarDiv.addEventListener("click", () => {
            addAction();
        });
        container.append(toolbarDiv);

        const buttonDiv = document.createElement("div");
        buttonDiv.className = "btn btn-light border-0 pt-2";
        toolbarDiv.appendChild(buttonDiv);

        const img = document.createElement("img");
        img.src = SvgAssets["add"];
        buttonDiv.appendChild(img);

        // construct input field and search icon.
        const locationInputGroup = document.createElement("div");
        locationInputGroup.className = "location-input pt-2";
        toolbarDiv.append(locationInputGroup);

        const addLocationText = document.createElement("div");
        addLocationText.className = "border-0 text-muted";
        addLocationText.innerHTML = "Voeg locatie toe."
        locationInputGroup.append(addLocationText);
        
    }


    private static _buildLocationContent(container: HTMLElement, location: UILocation, 
        menu: boolean, search: () => void, remove?: () => void, menuAction?: () => void): HTMLInputElement {
        menu ??= false;

        // construct icon an add.
        const menuIcon = document.createElement("div");
        if (menu) {
            menuIcon.innerHTML = ComponentHtml["menuButton"];
        } else {
            menuIcon.innerHTML = ComponentHtml["menuPlaceholder"];
        }
        menuIcon.addEventListener("click", () => {
            menuAction();
        });
        container.append(menuIcon);

        // construct input field and search icon.
        const locationInputGroup = document.createElement("div");
        locationInputGroup.className = "input-group location-input";
        container.append(locationInputGroup);

        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control border-0";
        input.oninput = (e) => {
            search();
        };
        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                search();
            }
        };
        if (location.value) input.value = location.value;
        if (location.placeholder) input.placeholder = location.placeholder;
        locationInputGroup.append(input);

        const searchButton = document.createElement("button");
        searchButton.type = "button";
        searchButton.className = "btn btn-light border-0 invisible";
        searchButton.innerHTML = ComponentHtml["searchImg"];
        locationInputGroup.append(searchButton);
        input.addEventListener("focusin", () => {
            searchButton.className = "btn btn-light border-0";
        });
        input.addEventListener("focusout", () => {
            searchButton.className = "btn btn-light border-0 invisible";
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

    private _routeDetailContentSelect(container: HTMLElement, selected: boolean): void {
        if (selected) {
            container.className = "route-detail route-detail-selected row my-1";
        } else {
            container.className = "route-detail row my-1";
        }
    }

    private _buildRouteDetailContent(container: HTMLElement, description: string, stats: { distance: number, time: number }, 
        selected: boolean, download: () => void) {

        this._routeDetailContentSelect(container, selected);

        const descriptionElement = document.createElement("div");
        descriptionElement.className = "col-4 py-3";
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

        // construct icon and add.
        const gpxIconContainer = document.createElement("div");
        gpxIconContainer.className = "col-1 py-3";
        gpxIconContainer.addEventListener("click", () => download());
        container.append(gpxIconContainer);
        const gpxIcon = document.createElement("img");
        gpxIcon.src = SvgAssets["download"];
        gpxIconContainer.appendChild(gpxIcon);          
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

    private _buildSearchResult(element: HTMLElement, result: {description: string, type: string, location: { lng: number; lat: number }}, searchString: string,
        select: () => void): void {

        const rowElement = document.createElement("div");
        rowElement.className = "search-result row my-1";
        // rowElement.addEventListener("click", () => {
        //     select();
        // });
        element.append(rowElement);

        const iconImgElement = document.createElement("img");
        iconImgElement.src = GlobalSvgIconAssets["marker-grey"];

        const iconElement = document.createElement("div");
        iconElement.className = "col-2 pl-4 py-2";

        console.log(result);
        switch(result.type){
            case "address":
                iconImgElement.src = GlobalSvgIconAssets["house"];
                break;
            case "building":
                iconImgElement.src = GlobalSvgIconAssets["building"];
                break;
            case "shop":
            case "retail":
                iconImgElement.src = GlobalSvgIconAssets["shop"];
                break;
            case "railway":
                iconImgElement.src = GlobalSvgIconAssets["train"];
                break;
            case "bus_stop":
                iconImgElement.src = GlobalSvgIconAssets["bus"];
                break;
            case "road":
            case "street":
                iconImgElement.src = GlobalSvgIconAssets["road"];
                break;
            case "city":
            case "village":
            case "neighbourhood":
                iconImgElement.src = GlobalSvgIconAssets["city"];
                break;
        }

        iconElement.addEventListener("click", () => {
            select();
        });
        iconElement.appendChild(iconImgElement);

        rowElement.append(iconElement);

        const resultElement = document.createElement("div");
        resultElement.className = "col-10 py-2 p-0";
        resultElement.innerHTML = result.description;
        resultElement.addEventListener("click", () => {
            select();
        });
        rowElement.append(resultElement);
    }
}