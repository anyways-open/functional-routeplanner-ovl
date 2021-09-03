export class RoutesLayerHook {
    public on: (name: string, handler: (e: any) => void) => void;
    public setSelectedAlternative: ((index: number) => void);
}