export interface LayerConfig {
    readonly id: string,
    readonly name: string;
    readonly layers: string[];
    readonly logo: string,
    visible: boolean;
    enabled: boolean;
}