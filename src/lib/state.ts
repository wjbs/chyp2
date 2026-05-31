import { Graph } from "./graph";
import { convexLayout } from "./layout";
import { Term } from "./term";
import { lineNumberForPosition } from "./util";

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
        if (this.lhs) convexLayout(this.lhs);
        if (this.rhs) convexLayout(this.rhs);
    }
}

export class GenPart extends GraphPart {
    name: string = '';
    inputArity: number = 0;
    outputArity: number = 0;

    public eval(): void {
        if (!this.state) return;

        if (this.state.graphs[this.name]) {
            this.status = Part.INVALID;
            throw new EvalError(`Generator name "${this.name}" already exists.`);
        } else {
            this.lhs = Graph.gen(this.name, this.inputArity, this.outputArity);
            this.state.graphs[this.name] = this.lhs;
            this.status = Part.VALID;
        }
    }
}

export class LetPart extends GraphPart {
    name: string = '';
    term: Term = new Term();

    public eval(): void {
        if (!this.state) return;

        if (this.state.graphs[this.name]) {
            this.status = Part.INVALID;
            throw new EvalError(`Graph name "${this.name}" already exists.`, this.index);
        } else {
            try {
                this.lhs = this.term.toGraph(this.state.graphs);
                this.state.graphs[this.name] = this.lhs;
                this.status = Part.VALID;
            } catch (e) {
                this.status = Part.INVALID;
                throw new EvalError(`Error evaluating term in let expression "${this.name}": ${e}`, this.index);
            }
        }
    }
}

export class State {
    parts: Part[] = [];
    graphs: { [name: string]: Graph } = {};
    errors: EvalError[] = [];

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