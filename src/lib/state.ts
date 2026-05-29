type PartStatus = 0 | 1 | 2 | 3;

export class Part {
    static UNCHECKED: PartStatus = 0;
    static CHECKING: PartStatus = 1;
    static VALID: PartStatus = 2;
    static INVALID: PartStatus = 3;

    status: PartStatus = Part.UNCHECKED;
    start: number = 0;
    end: number = 0;
}

export class State {
    parts: Part[] = [];
}