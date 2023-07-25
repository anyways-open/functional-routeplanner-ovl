import {derived, Readable, writable, Writable} from "svelte/store";

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
     * True when we have to assume touch.
     */
    public static assumeTouch: Readable<boolean> = AppGlobal.createAssumeTouchStore();

    private static createAssumeTouchStore(): Readable<boolean> {
        console.log("createAssumeTouchStore");
        return derived([this.hasTouch, this.isSmall], 
            ([$hasTouch, $isSmall]) => $hasTouch && $isSmall);

    }
}