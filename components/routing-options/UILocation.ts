export interface UILocation {
    type: "via" | "user" | "end" | "start";
    value?: string;
    placeholder?: string;
}