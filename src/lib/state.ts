import { Graph } from "./graph";
import { convexLayout } from "./layout";
import { Rule } from "./rule";
import { Tactic, RuleTactic, TacticArgs } from "./tactic";
import { Term } from "./term";
import { ProofState, Goal, ProofError } from "./proofstate";
import { currentSettings, lineNumberForPosition } from "./util";

type PartStatus = 0 | 1 | 2 | 3;

export class EvalError extends Error {
    partIndex: number;
    constructor(message: string, partIndex: number = -1) {
        super(message);
        this.name = "EvalError";
        this.partIndex = partIndex;
    }
}

export class Part {
    static UNCHECKED: PartStatus = 0;
    static CHECKING: PartStatus = 1;
    static VALID: PartStatus = 2;
    static INVALID: PartStatus = 3;

    status: PartStatus = Part.UNCHECKED;
    start: number;
    end: number;
    index: number = 0;
    state: State | null = null;

    constructor(start: number = 0, end: number = 0) {
        this.start = start;
        this.end = end;
    }

    eval(): void { }
}

export class GraphPart extends Part {
    lhs: Graph | null = null;
    rhs: Graph | null = null;

    public layout(): void {
        if (this.lhs) convexLayout(currentSettings, this.lhs);
        if (this.rhs) convexLayout(currentSettings, this.rhs);
    }
}

export class GenPart extends GraphPart {
    name: string = '';
    inputArity: number = 0;
    outputArity: number = 0;

    public eval(): void {
        const state = this.state;
        if (!state) return;

        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        } else {
            this.lhs = Graph.gen(this.name, this.inputArity, this.outputArity);
            state.setGraph(this.name, this.lhs, this.index);
            this.status = Part.VALID;
        }
    }
}

export class LetPart extends GraphPart {
    name: string = '';
    term: Term = new Term();

    public eval(): void {
        const state = this.state;
        if (!state) return;

        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        } else {
            try {
                this.lhs = this.term.toGraph((name) => state.getGraph(name, this.index));
                state.setGraph(this.name, this.lhs, this.index);
                this.status = Part.VALID;
            } catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error in let expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}

export class DefPart extends GraphPart {
    name: string = '';
    term: Term = new Term();

    public eval(): void {
        const state = this.state;
        if (!state) return;

        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        } else if (state.symbolDefined(this.name + "_def", this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}_def" (implicitly defined here) already exists.`, this.index);
        } else {
            try {
                this.lhs = this.term.toGraph((name) => state.getGraph(name, this.index));
                const newGen = Graph.gen(this.name, this.lhs.inputs().length, this.lhs.outputs().length);
                const rule = new Rule(
                    newGen,
                    this.lhs,
                    this.name + "_def"
                );

                state.setGraph(this.name, newGen, this.index);
                state.setRule(rule.name, rule, this.index);
                this.status = Part.VALID;
            } catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error in def expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}

export class RulePart extends GraphPart {
    name: string = '';
    lhsTerm: Term = new Term();
    rhsTerm: Term = new Term();

    public eval(): void {
        const state = this.state;
        if (!state) return;

        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        } else {
            try {
                this.lhs = this.lhsTerm.toGraph((name) => state.getGraph(name, this.index));
                this.rhs = this.rhsTerm.toGraph((name) => state.getGraph(name, this.index));
                const rule = new Rule(
                    this.lhs,
                    this.rhs,
                    this.name
                );
                state.setRule(rule.name, rule, this.index);

                this.status = Part.VALID;
            } catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error in rule expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}

export class RewritePart extends GraphPart {
    name: string = '';
    firstLhsTerm: Term | null = null;
    lhsTerm: Term | null = null;
    rhsTerm: Term | null = null;
    tacticName: string = '';
    tacticArgs: TacticArgs = new TacticArgs();

    // check this is the last part (i.e. firstLhsTerm is not null) and that all previous parts are
    // marked as valid
    isFinishedTheorem(): boolean {
        const state = this.state;
        if (!state) return false;
        if (this.firstLhsTerm === null) { return false; }

        for (let i = this.index; i >= 0; i--) {
            const part = state.parts[i];
            if (!(part instanceof RewritePart && part.name === this.name)) {
                break;
            }
            if (part.status !== Part.VALID) {
                return false;
            }
        }
        return true;
    }

    public eval(): void {
        const state = this.state;
        if (!state) return;

        // check if the previous part is invalid. This assumes parts are evaluated synchronously and in order
        const prevPart = state.parts[this.index - 1];
        if (prevPart instanceof RewritePart &&
            prevPart.name === this.name &&
            prevPart.status === Part.INVALID) {
            this.status = Part.INVALID;
            return;
        }

        try {
            if (this.lhsTerm) {
                this.lhs = this.lhsTerm.toGraph((name) => state.getGraph(name, this.index));
            }

            if (this.rhsTerm) {
                this.rhs = this.rhsTerm.toGraph((name) => state.getGraph(name, this.index));
            }

            if (!this.lhs || !this.rhs) {
                this.status = Part.INVALID;
                return;
            }

            if ((this.lhs.inputs().length !== this.rhs.inputs().length ||
                this.lhs.outputs().length !== this.rhs.outputs().length)) {
                throw new EvalError(`LHS and RHS of a rewrite must have the same number of inputs and outputs.`);
            }

            const proofState = new ProofState(state, new Goal(this.lhs, this.rhs), this.index);
            try {
                let tactic: Tactic;
                switch (this.tacticName) {
                    case "rule":
                        tactic = new RuleTactic(proofState, this.tacticArgs);
                        break;
                    default:
                        tactic = new Tactic(proofState, this.tacticArgs);
                }
                tactic.apply();
            } catch (e) {
                if (e instanceof ProofError) {
                    throw new EvalError(`Error in tactic "${this.tacticName}": ${e}`);
                }
            }

            if (proofState.isGoalSolved()) {
                this.status = Part.VALID;
                if (this.isFinishedTheorem()) {
                    const lhs = this.firstLhsTerm!.toGraph((name) => state.getGraph(name, this.index));
                    const rule = new Rule(lhs, this.rhs, this.name);
                    state.setRule(rule.name, rule, this.index);
                }
            } else {
                this.status = Part.INVALID;
                throw new EvalError(`Tactic "${this.tacticName}" did not solve the goal.`);
            }
        } catch (e) {
            this.status = Part.INVALID;
            throw new EvalError(`Error in rewrite expression "${this.name}": ${e}`, this.index);
        }
    }
}

export class ShowPart extends GraphPart {
    name: string = '';
    public eval(): void {
        const state = this.state;
        if (!state) return;

        const rule = state.getRule(this.name, this.index);
        if (rule) {
            this.lhs = rule.lhs.copy();
            this.rhs = rule.rhs.copy();
            this.status = Part.VALID;
            return;
        }

        const graph = state.getGraph(this.name, this.index);
        if (graph) {
            this.lhs = graph.copy();
            this.status = Part.VALID;
            return;
        }

        this.status = Part.INVALID;
        throw new EvalError(`Name "${this.name}" not found.`, this.index);
    }
}

export class State {
    parts: Part[] = [];
    errors: EvalError[] = [];
    private symbols: { [name: string]: { s: Graph | Rule, index: number } } = {};

    // check whether a symbol is defined and was defined before the given index (or any index if -1)
    symbolDefined(name: string, index: number = -1): boolean {
        const entry = this.symbols[name];
        return !!entry && (index === -1 || entry.index < index);
    }

    setGraph(name: string, g: Graph, index: number = -1): void {
        this.symbols[name] = { s: g, index };
    }

    setRule(name: string, r: Rule, index: number = -1): void {
        this.symbols[name] = { s: r, index };
    }

    getGraph(name: string, index: number = -1): Graph | null {
        const entry = this.symbols[name];
        if (entry && entry.s instanceof Graph && (index === -1 || entry.index < index)) {
            return entry.s;
        } else {
            return null;
        }
    }

    getRule(name: string, index: number = -1): Rule | null {
        const entry = this.symbols[name];
        if (entry && entry.s instanceof Rule && (index === -1 || entry.index < index)) {
            return entry.s;
        } else {
            return null;
        }
    }

    addPart(part: Part): void {
        part.index = this.parts.length;
        part.state = this;
        this.parts.push(part);
    }

    getPartIndexAt(pos: number): number {
        for (const [index, part] of this.parts.entries()) {
            if (part.start <= pos && pos <= part.end) {
                return index;
            }
        }
        return -1;
    }

    getPartAt(pos: number): Part | null {
        const index = this.getPartIndexAt(pos);
        return index !== -1 ? this.parts[index] : null;
    }

    evalAll(): void {
        for (const part of this.parts) {
            try {
                part.eval();
            } catch (e) {
                if (e instanceof EvalError) {
                    this.errors.push(e);
                } else {
                    throw e;
                }
            }
        }
    }

    logErrors(source: string): void {
        if (this.errors.length > 0) {
            console.error("Evaluation errors:");
            for (const error of this.errors) {
                const part = this.parts[error.partIndex];
                if (part) {
                    const line = lineNumberForPosition(source, part.start);
                    console.error(`[${line}]: ${error.message}`);
                } else {
                    console.error(`[??]: ${error.message}`);
                }
            }
        }
    }
}