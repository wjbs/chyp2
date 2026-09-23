export declare const SCALE = 100;
export declare function lineNumberForPosition(source: string, pos: number): number;
interface USE_DOM_FOR_TEXT_WIDTH_T {
    USE_DOM_FOR_TEXT_WIDTH: Boolean;
}
export declare var USE_DOM_FOR_TEXT_WIDTH: USE_DOM_FOR_TEXT_WIDTH_T;
export declare function approxTextWidth(s: string): number;
export declare function getTextWidth(s: string): number;
export declare function mkBezierC(p1x: number, p1y: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, p2x: number, p2y: number): string;
export declare function curveBetween(p1x: number, p1y: number, p2x: number, p2y: number): string;
export declare function curveTo(p1x: number, p1y: number, p2x: number, p2y: number): string;
export declare function vertexiyShift(i: number, num: number): number;
export declare function vertexyShift(v: number, st: number[]): number;
export declare function inversions(p: number[]): number;
export declare function inversionsWRT(ordering: number[], p: number[]): number;
export declare function inversionsBetween(ordering: number[], vs: number[], ws: number[]): number;
export interface OPTIMSettings {
    min_boundary_height: number;
    boundary_weight: number;
    edge_gap_weight: number;
    vertex_gap_weight: number;
    edge_gap_factor: number;
    layer_gap: number;
    layer_gap_sqrt_invers_weight: number;
}
export interface Chyp2Settings {
    OPTIM: OPTIMSettings;
    layout: "OPTIM" | "NAIVE";
}
export declare const defaultOptimSettings: OPTIMSettings;
export declare const defaultSettings: Chyp2Settings;
export declare function updateOptimSettings(partialSettings: any, settings: OPTIMSettings): OPTIMSettings;
export declare function updateSettings(partialSettings: any, settings: Chyp2Settings): Chyp2Settings;
export {};
