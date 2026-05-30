import { Graph } from "./graph";
import { convexLayout } from "./layout";
import type { Term } from "./term";

type PartStatus = 0 | 1 | 2 | 3;

export class Part {
    static UNCHECKED: PartStatus = 0;
    static CHECKING: PartStatus = 1;
    static VALID: PartStatus = 2;
    static INVALID: PartStatus = 3;

    status: PartStatus = Part.UNCHECKED;
    start: number;
    end: number;
    sequence: number = 0;
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
            console.error(`Generator name "${this.name}" already exists.`);
        } else {
            this.lhs = Graph.gen(this.name, this.inputArity, this.outputArity);
            this.state.graphs[this.name] = this.lhs;
            this.status = Part.VALID;
        }
    }
}

export class LetPart extends GraphPart {
    name: string = '';
    term: Term | null = null;

    public eval(): void {
        if (!this.state) return;

        if (this.state.graphs[this.name]) {
            this.status = Part.INVALID;
            console.error(`Graph name "${this.name}" already exists.`);
        } else if (!this.term) {
            this.status = Part.INVALID;
            console.error(`Term is null for LetPart "${this.name}".`);
        } else {
            try {
                console.log(this.state.graphs);
                this.lhs = this.term.toGraph(this.state.graphs);
                this.state.graphs[this.name] = this.lhs;
                this.status = Part.VALID;
            } catch (e) {
                this.status = Part.INVALID;
                console.error(`Error evaluating term for LetPart "${this.name}":`, e);
            }
        }
    }
}

export class State {
    private sequence = 0;
    parts: Part[] = [];
    graphs: { [name: string]: Graph } = {};

    addPart(part: Part): void {
        part.sequence = this.sequence++;
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
            part.eval();
        }
    }
}