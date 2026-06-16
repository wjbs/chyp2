import { ProofState, ProofError } from "./proofstate";

export class TacticArgs {
    rules: string[] = [];
    flags: string[] = [];
}

export class Tactic {
    proofState: ProofState;
    args: TacticArgs;

    constructor(proofState: ProofState, args: TacticArgs) {
        this.proofState = proofState;
        this.args = args;
    }

    apply(): boolean {
        if (this.proofState.isGoalSolved()) {
            return true;
        }

        throw new ProofError("refl tactic applied on a non-trivial goal");
    }
}

export class RuleTactic extends Tactic {
    apply(): boolean {
        const ruleName = this.args.rules[0];

        for (const [_m1, _m2] of this.proofState.rewriteGoal(ruleName, "lhs")) {
            if (this.proofState.isGoalSolved()) {
                return true;
            }
        }

        throw new ProofError(`Rule "${ruleName}" could not solve the goal.`);
    }
}