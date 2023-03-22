import { get, writable, Writable } from "svelte/store";

export class AppGlobal {
    /**
     * True when the screen has touch options.
     */
    public static hasTouch: Writable<boolean> = writable(true);
    /**
     * True when the screen is small.
     */
    public static isSmall: Writable<boolean> = writable(true);

    /**
     * Checks if we need to assume touch interactions are the main method of interaction.
     * 
     * @returns True if touch, false otherwise.
     */
    public static assumeTouch(): boolean {
        return get(AppGlobal.hasTouch) && get(AppGlobal.isSmall);
    }
}