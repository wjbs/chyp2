import { ProofState, ProofError } from "./proofstate";
export class TacticArgs {
    rules = [];
    flags = [];
}
export class Tactic {
    proofState;
    args;
    constructor(proofState, args) {
        this.proofState = proofState;
        this.args = args;
    }
    apply() {
        if (this.proofState.isGoalSolved()) {
            return true;
        }
        throw new ProofError("refl tactic applied on a non-trivial goal");
    }
}
export class RuleTactic extends Tactic {
    apply() {
        const ruleName = this.args.rules[0];
        for (const [_m1, _m2] of this.proofState.rewriteGoal(ruleName, "lhs")) {
            if (this.proofState.isGoalSolved()) {
                return true;
            }
        }
        throw new ProofError(`Rule "${ruleName}" could not solve the goal.`);
    }
}
