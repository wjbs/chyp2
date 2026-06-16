import { Graph } from "./graph";
import { Rule } from "./rule";
import { State } from "./state";
import { matchRule, Match, findIso } from "./matcher";
import { dpo } from "./rewrite";

export class ProofError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProofError";
    }
}

export class Goal {
    lhs: Graph;
    rhs: Graph;
    constructor(lhs: Graph, rhs: Graph) {
        this.lhs = lhs.copy();
        this.rhs = rhs.copy();
    }
}

export class ProofState {
    state: State;
    goal: Goal;
    location: number;
    context: { [name: string]: Rule } = {};

    constructor(state: State, goal: Goal, location: number) {
        this.state = state;
        this.goal = goal;
        this.location = location;
    }

    addRuleToContext(name: string, newName: string = ""): void {
        const converse = name.startsWith("-");
        if (converse) {
            name = name.slice(1);
        }
        const rule = this.state.getRule(name);
        if (!rule) {
            throw new ProofError(`Rule "${name}" not found`);
        }
        this.context[newName || name] = converse ? rule.converse() : rule.copy();
    }

    addReflToContext(name: string, graph: Graph): void {
        const rule = new Rule(graph.copy(), graph.copy(), name, true);
        this.context[name] = rule.copy();
    }

    lookupRule(name: string): Rule | null {
        const converse = name.startsWith("-");
        if (converse) {
            name = name.slice(1);
        }
        if (name in this.context) {
            return converse ? this.context[name].converse() : this.context[name].copy();
        }
        const rule = this.state.getRule(name, this.location);
        if (rule) {
            return converse ? rule.converse() : rule.copy();
        }
        return null;
    }

    *rewriteGoal(ruleName: string, side: "lhs" | "rhs"): Generator<[Match, Match]> {
        const g = this.goal[side];
        const rule = this.lookupRule(ruleName);
        if (!rule) {
            throw new ProofError(`Rule "${ruleName}" not found`);
        }
        for (const m of matchRule(rule, g, true)) {
            const result = dpo(rule, m);
            this.goal[side] = result.cod.copy();
            yield [m, result];
        }
    }

    isGoalSolved(): boolean {
        return findIso(this.goal.lhs, this.goal.rhs) !== undefined;
    }
}