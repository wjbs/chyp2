import { Graph } from "./graph";
import { Rule } from "./rule";
import { State } from "./state";
import { Match } from "./matcher";
export declare class ProofError extends Error {
    constructor(message: string);
}
export declare class Goal {
    lhs: Graph;
    rhs: Graph;
    constructor(lhs: Graph, rhs: Graph);
}
export declare class ProofState {
    state: State;
    goal: Goal;
    location: number;
    context: {
        [name: string]: Rule;
    };
    constructor(state: State, goal: Goal, location: number);
    addRuleToContext(name: string, newName?: string): void;
    addReflToContext(name: string, graph: Graph): void;
    lookupRule(name: string): Rule | null;
    rewriteGoal(ruleName: string, side: "lhs" | "rhs"): Generator<[Match, Match]>;
    isGoalSolved(): boolean;
}
