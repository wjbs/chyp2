import { Graph } from './graph.ts';
export declare class RuleError extends Error {
    constructor(message: string);
}
export declare class Rule {
    lhs: Graph;
    rhs: Graph;
    name: string;
    equiv: boolean;
    constructor(lhs: Graph, rhs: Graph, name?: string, equiv?: boolean);
    copy(): Rule;
    converse(): Rule;
    /** Returns true if the boundary on the LHS embeds injectively (no repeated vertex in inputs/outputs) */
    isLeftLinear(): boolean;
}
