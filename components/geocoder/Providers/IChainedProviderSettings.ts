import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./IProvider";
import { IReverseResult } from "./IReverseResult";

export interface IChangedProviderSettings {
    provider: IProvider, 
    chainForward?: (previousResults: IForwardResult[], results: IForwardResult[]) => { next: boolean, results: IForwardResult[] }; 
    chainReverse?: (l: {lng: number, lat: number }, previousResults: IReverseResult[], results: IReverseResult[]) => { next: boolean, results: IReverseResult[] }; 
}