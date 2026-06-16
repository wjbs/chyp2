import { Graph } from "./graph";
import { convexLayout } from "./layout";
import { Rule } from "./rule";
import { TacticArgs } from "./tactic";
import { Term } from "./term";
import { lineNumberForPosition } from "./util";
export class EvalError extends Error {
    partIndex;
    constructor(message, partIndex = -1) {
        super(message);
        this.name = "EvalError";
        this.partIndex = partIndex;
    }
}
export class Part {
    static UNCHECKED = 0;
    static CHECKING = 1;
    static VALID = 2;
    static INVALID = 3;
    status = Part.UNCHECKED;
    start;
    end;
    index = 0;
    state = null;
    constructor(start = 0, end = 0) {
        this.start = start;
        this.end = end;
    }
    eval() { }
}
export class GraphPart extends Part {
    lhs = null;
    rhs = null;
    layout() {
        if (this.lhs)
            convexLayout(this.lhs);
        if (this.rhs)
            convexLayout(this.rhs);
    }
}
export class GenPart extends GraphPart {
    name = '';
    inputArity = 0;
    outputArity = 0;
    eval() {
        const state = this.state;
        if (!state)
            return;
        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        }
        else {
            this.lhs = Graph.gen(this.name, this.inputArity, this.outputArity);
            state.setGraph(this.name, this.lhs, this.index);
            this.status = Part.VALID;
        }
    }
}
export class LetPart extends GraphPart {
    name = '';
    term = new Term();
    eval() {
        const state = this.state;
        if (!state)
            return;
        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        }
        else {
            try {
                this.lhs = this.term.toGraph((name) => state.getGraph(name, this.index));
                state.setGraph(this.name, this.lhs, this.index);
                this.status = Part.VALID;
            }
            catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error in let expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}
export class DefPart extends GraphPart {
    name = '';
    term = new Term();
    eval() {
        const state = this.state;
        if (!state)
            return;
        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        }
        else if (state.symbolDefined(this.name + "_def", this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}_def" (implicitly defined here) already exists.`, this.index);
        }
        else {
            try {
                this.lhs = this.term.toGraph((name) => state.getGraph(name, this.index));
                const newGen = Graph.gen(this.name, this.lhs.inputs().length, this.lhs.outputs().length);
                const rule = new Rule(newGen, this.lhs, this.name + "_def");
                state.setGraph(this.name, newGen, this.index);
                state.setRule(rule.name, rule, this.index);
                this.status = Part.VALID;
            }
            catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error in def expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}
export class RulePart extends GraphPart {
    name = '';
    lhsTerm = new Term();
    rhsTerm = new Term();
    eval() {
        const state = this.state;
        if (!state)
            return;
        if (state.symbolDefined(this.name, this.index)) {
            this.status = Part.INVALID;
            throw new EvalError(`Name "${this.name}" already exists.`, this.index);
        }
        else {
            try {
                this.lhs = this.lhsTerm.toGraph((name) => state.getGraph(name, this.index));
                this.rhs = this.rhsTerm.toGraph((name) => state.getGraph(name, this.index));
                const rule = new Rule(this.lhs, this.rhs, this.name);
                state.setRule(rule.name, rule, this.index);
                this.status = Part.VALID;
            }
            catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error in rule expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}
export class RewritePart extends GraphPart {
    name = '';
    firstLhsTerm = new Term();
    lhsTerm = new Term();
    rhsTerm = null;
    tacticName = '';
    tacticArgs = new TacticArgs();
    eval() {
        const state = this.state;
        if (!state)
            return;
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
            if (this.lhs && this.rhs &&
                (this.lhs.inputs().length !== this.rhs.inputs().length ||
                    this.lhs.outputs().length !== this.rhs.outputs().length)) {
                throw new EvalError(`LHS and RHS of a rewrite must have the same number of inputs and outputs.`);
            }
            // TODO: run tactic code here
            this.status = Part.VALID;
        }
        catch (e) {
            this.status = Part.INVALID;
            throw new EvalError(`Error in rewrite expression "${this.name}": ${e}`, this.index);
        }
    }
}
export class State {
    parts = [];
    errors = [];
    symbols = {};
    // check whether a symbol is defined and was defined before the given index (or any index if -1)
    symbolDefined(name, index = -1) {
        const entry = this.symbols[name];
        return !!entry && (index === -1 || entry.index < index);
    }
    setGraph(name, g, index = -1) {
        this.symbols[name] = { s: g, index };
    }
    setRule(name, r, index = -1) {
        this.symbols[name] = { s: r, index };
    }
    getGraph(name, index = -1) {
        const entry = this.symbols[name];
        if (entry && entry.s instanceof Graph && (index === -1 || entry.index < index)) {
            return entry.s;
        }
        else {
            return null;
        }
    }
    getRule(name, index = -1) {
        const entry = this.symbols[name];
        if (entry && entry.s instanceof Rule && (index === -1 || entry.index < index)) {
            return entry.s;
        }
        else {
            return null;
        }
    }
    addPart(part) {
        part.index = this.parts.length;
        part.state = this;
        this.parts.push(part);
    }
    getPartIndexAt(pos) {
        for (const [index, part] of this.parts.entries()) {
            if (part.start <= pos && pos <= part.end) {
                return index;
            }
        }
        return -1;
    }
    getPartAt(pos) {
        const index = this.getPartIndexAt(pos);
        return index !== -1 ? this.parts[index] : null;
    }
    evalAll() {
        for (const part of this.parts) {
            try {
                part.eval();
            }
            catch (e) {
                if (e instanceof EvalError) {
                    this.errors.push(e);
                }
                else {
                    throw e;
                }
            }
        }
    }
    logErrors(source) {
        if (this.errors.length > 0) {
            console.error("Evaluation errors:");
            for (const error of this.errors) {
                const part = this.parts[error.partIndex];
                if (part) {
                    const line = lineNumberForPosition(source, part.start);
                    console.error(`[${line}]: ${error.message}`);
                }
                else {
                    console.error(`[??]: ${error.message}`);
                }
            }
        }
    }
}
