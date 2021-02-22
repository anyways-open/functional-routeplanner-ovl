export interface UILocation {
    type: "via" | "user" | "end" | "start" | "empty";
    value?: string;
    placeholder?: string;
}