export interface LayerConfig {
    readonly name: string
    readonly layers: string[]
    readonly build?: ((element: HTMLElement, config: LayerConfig) => void)
    visible?: boolean
}