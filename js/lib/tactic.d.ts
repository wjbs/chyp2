import { ProofState } from "./proofstate";
export declare class TacticArgs {
    rules: string[];
    flags: string[];
}
export declare class Tactic {
    proofState: ProofState;
    args: TacticArgs;
    constructor(proofState: ProofState, args: TacticArgs);
    apply(): boolean;
}
export declare class RuleTactic extends Tactic {
    apply(): boolean;
}
