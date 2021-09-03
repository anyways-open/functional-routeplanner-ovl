export class UserLocationLayerHook {
    public on: (name: string, handler: (e: any) => void) => void;
    public trigger: () => void;
}