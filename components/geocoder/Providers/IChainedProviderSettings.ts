import { IForwardResult } from "./IForwardResult";
import { IProvider } from "./IProvider";

export interface IChangedProviderSettings {
    provider: IProvider, 
    chainForward?: (previousResults: IForwardResult[], results: IForwardResult[]) => { next: boolean, results: IForwardResult[] }; 
}