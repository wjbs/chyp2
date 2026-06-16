import { Graph } from "./graph";
import { Rule } from "./rule";
import { State } from "./state";
import { matchRule, Match, findIso } from "./matcher";
import { dpo } from "./rewrite";
export class ProofError extends Error {
    constructor(message) {
        super(message);
        this.name = "ProofError";
    }
}
export class Goal {
    lhs;
    rhs;
    constructor(lhs, rhs) {
        this.lhs = lhs.copy();
        this.rhs = rhs.copy();
    }
}
export class ProofState {
    state;
    goal;
    location;
    context = {};
    constructor(state, goal, location) {
        this.state = state;
        this.goal = goal;
        this.location = location;
    }
    addRuleToContext(name, newName = "") {
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
    addReflToContext(name, graph) {
        const rule = new Rule(graph.copy(), graph.copy(), name, true);
        this.context[name] = rule.copy();
    }
    lookupRule(name) {
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
    *rewriteGoal(ruleName, side) {
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
    isGoalSolved() {
        return findIso(this.goal.lhs, this.goal.rhs) !== undefined;
    }
}
