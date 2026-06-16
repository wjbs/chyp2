import { Graph } from "./graph";
import { Rule } from "./rule";
import { TacticArgs } from "./tactic";
import { Term } from "./term";
type PartStatus = 0 | 1 | 2 | 3;
export declare class EvalError extends Error {
    partIndex: number;
    constructor(message: string, partIndex?: number);
}
export declare class Part {
    static UNCHECKED: PartStatus;
    static CHECKING: PartStatus;
    static VALID: PartStatus;
    static INVALID: PartStatus;
    status: PartStatus;
    start: number;
    end: number;
    index: number;
    state: State | null;
    constructor(start?: number, end?: number);
    eval(): void;
}
export declare class GraphPart extends Part {
    lhs: Graph | null;
    rhs: Graph | null;
    layout(): void;
}
export declare class GenPart extends GraphPart {
    name: string;
    inputArity: number;
    outputArity: number;
    eval(): void;
}
export declare class LetPart extends GraphPart {
    name: string;
    term: Term;
    eval(): void;
}
export declare class DefPart extends GraphPart {
    name: string;
    term: Term;
    eval(): void;
}
export declare class RulePart extends GraphPart {
    name: string;
    lhsTerm: Term;
    rhsTerm: Term;
    eval(): void;
}
export declare class RewritePart extends GraphPart {
    name: string;
    firstLhsTerm: Term | null;
    lhsTerm: Term | null;
    rhsTerm: Term | null;
    tacticName: string;
    tacticArgs: TacticArgs;
    isFinishedTheorem(): boolean;
    eval(): void;
}
export declare class ShowPart extends GraphPart {
    name: string;
    eval(): void;
}
export declare class State {
    parts: Part[];
    errors: EvalError[];
    private symbols;
    symbolDefined(name: string, index?: number): boolean;
    setGraph(name: string, g: Graph, index?: number): void;
    setRule(name: string, r: Rule, index?: number): void;
    getGraph(name: string, index?: number): Graph | null;
    getRule(name: string, index?: number): Rule | null;
    addPart(part: Part): void;
    getPartIndexAt(pos: number): number;
    getPartAt(pos: number): Part | null;
    evalAll(): void;
    logErrors(source: string): void;
}
export {};
