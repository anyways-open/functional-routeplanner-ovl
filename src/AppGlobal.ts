import { get, Readable, writable, Writable } from "svelte/store";

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

    private static createAssumeTouchStore(): Writable<boolean> {
        console.log("createAssumeTouchStore");

        var assumeTouchStore: Writable<boolean> = writable(true);

        this.hasTouch.subscribe(v => {
            assumeTouchStore.set(v && get(AppGlobal.isSmall));
        });
        
        this.isSmall.subscribe(v => {
            assumeTouchStore.set(get(AppGlobal.hasTouch) && v);
        });

        return assumeTouchStore;
    }
}