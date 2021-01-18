import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { Profile } from "./Profile";
import { Profiles } from "./Profiles";

export class RoutingApi {
    url: string;
    key: string;

    constructor(url: string, key?: string) {
        this.url = url;
        this.key = key;
    }

    getProfiles(callback: (profiles: Profile[]) => void) {        
        var requestConfig: AxiosRequestConfig = {
            baseURL: this.url,
            url: "/v1/profiles",
            params: {
                apiKey: this.key
            }
        };

        axios(requestConfig).then(response => {
            if(response.data.profiles){
                // In an older version of the API, the API gave a list for the profiles
                // But the profiles had to be encapsulated...
                response.data = response.data.profiles;
            }
            var parse = <Profile[]>response.data;
            callback(parse);
        }).catch(reason => {
            console.log("getProfiles failed: " + reason);
        }); 
    }

    getRoute(options: { locations: { lng: number, lat: number }[], profile: string }, callback: (route: any) => void) {
        var requestConfig: AxiosRequestConfig = {
            baseURL: this.url,
            url: "/v1/routes",
            params: {
                apiKey: this.key,
                locations: options.locations,
                profile: options.profile
            },
            paramsSerializer: (params) => {
                var loc = "";
                for (var l in params.locations) {
                    var location = params.locations[l];
                    if (loc.length > 0) loc += "&";
                    loc = loc + `loc=${ location.lng },${ location.lat }`;
                }
                loc = loc + `&profile=${ params.profile }`;
                return loc;
            }
        };

        axios(requestConfig).then(response => {
            var parse = response.data;
            callback(parse);
        }).catch(reason => {
            console.log("getRoute failed: " + reason);
        }); 
    }
}