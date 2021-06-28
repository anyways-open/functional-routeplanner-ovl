export interface LayerConfig {
    readonly id: string;
    readonly name: string;
    readonly layers: string[];
    readonly build?: ((element: HTMLElement, config: LayerConfig) => void);
    readonly visible: boolean;
    readonly enabled: boolean;
}