import { Graph } from './graph.ts';
import { Rule } from './rule.ts';
export declare class Match {
    dom: Graph;
    cod: Graph;
    vmap: Map<number, number>;
    vimg: Set<number>;
    emap: Map<number, number>;
    eimg: Set<number>;
    constructor(dom: Graph, cod: Graph);
    constructor(m: Match);
    toString(): string;
    copy(): Match;
    tryAddVertex(v: number, codV: number): boolean;
    tryAddEdge(e: number, codE: number): boolean;
    /** Returns true if every edge in nhd(v) is already in the domain of emap */
    domNhdMapped(v: number): boolean;
    /**
     * Try to extend the match by mapping all scalar edges (0 -> 0 edges).
     *
     * Returns true if successful. Scalar matches yield isomorphic rewriting results so
     * only one matching is tried rather than enumerating all possibilities.
     */
    mapScalars(): boolean;
    /**
     * Returns a list of partial matches identical to this one but with one additional
     * vertex or edge mapped. Used by Matches to drive the search stack.
     */
    more(): Match[];
    isTotal(): boolean;
    isSurjective(): boolean;
    isInjective(): boolean;
    isConvex(): boolean;
}
/**
 * Lazily enumerates all matches from `dom` into `cod`.
 *
 * Implements both `Iterable<Match>` and `Iterator<Match>` so it can be used
 * directly in `for...of` loops or consumed one result at a time via `.next()`.
 */
export declare class Matches implements Iterable<Match>, Iterator<Match, undefined> {
    private matchStack;
    private readonly convex;
    constructor(dom: Graph, cod: Graph, initialMatch?: Match, convex?: boolean);
    [Symbol.iterator](): this;
    next(): IteratorResult<Match, undefined>;
}
/** Returns an iterable of all (convex) matches from `dom` into `cod` */
export declare function matchGraph(dom: Graph, cod: Graph, convex?: boolean): Matches;
/** Returns an iterable of all (convex) matches of the rule's LHS into `g` */
export declare function matchRule(r: Rule, g: Graph, convex?: boolean): Matches;
/**
 * Finds an isomorphism from `g` to `h` that respects boundaries, or returns
 * `undefined` if none exists.
 */
export declare function findIso(g: Graph, h: Graph): Match | undefined;
