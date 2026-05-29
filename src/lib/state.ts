import type { Graph } from "./graph";
import { convexLayout } from "./layout";

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

    constructor(start: number = 0, end: number = 0) {
        this.start = start;
        this.end = end;
    }
}

export class GraphPart extends Part {
    lhs: Graph | null = null;
    rhs: Graph | null = null;

    public layout(): void {
        if (this.lhs) convexLayout(this.lhs);
        if (this.rhs) convexLayout(this.rhs);
    }
}

export class State {
    private sequence = 0;
    parts: Part[] = [];

    addPart(part: Part): void {
        part.sequence = this.sequence++;
        this.parts.push(part);
    }

    getPartAt(pos: number): Part | null {
        for (const part of this.parts) {
            if (part.start <= pos && pos < part.end) {
                return part;
            }
        }
        return null;
    }
}