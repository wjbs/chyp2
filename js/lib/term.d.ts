import { Graph } from './graph.ts';
export declare class Term {
    toGraph(_defs: (name: string) => Graph | null): Graph;
    toString(): string;
}
export declare class Atom extends Term {
    ident: string;
    constructor(ident: string);
    toString(): string;
    toGraph(defs: (name: string) => Graph | null): Graph;
}
export declare class Perm extends Term {
    perm: number[];
    constructor(perm: number[]);
    toString(): string;
    toGraph(_defs: (name: string) => Graph | null): Graph;
}
export declare class Seq extends Term {
    children: Term[];
    constructor(children?: Term[]);
    toString(): string;
    toGraph(defs: (name: string) => Graph | null): Graph;
}
export declare class Par extends Term {
    children: Term[];
    constructor(children?: Term[]);
    toString(): string;
    toGraph(defs: (name: string) => Graph | null): Graph;
}
/**
 * Decompose a graph into regular and singular layers.
 *
 * Returns a list of edge layers. Note that this can modify `g` by introducing
 * extra vertices and identity boxes.
 */
export declare function layerDecomp(g: Graph): number[][];
/** Convert a permutation to its string representation */
export declare function permToString(perm: number[]): string;
/**
 * Split a permutation into a tensor product of independent sub-permutations.
 *
 * The input permutation is split at the earliest index where the maximum value
 * seen so far equals the current index.
 */
export declare function splitPerm(perm: number[]): number[][];
/**
 * Convert a graph to a term string.
 *
 * Currently only works for monogamous acyclic graphs (symmetric monoidal terms).
 */
export declare function graphToTerm(g: Graph): Term;
