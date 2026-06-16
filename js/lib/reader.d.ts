import { Tree, TreeCursor } from "@lezer/common";
import { State } from "./state";
import { Term } from "./term";
export declare function logTree(parseTree: Tree): void;
export declare class ChypReader {
    state: State;
    c: TreeCursor | null;
    source: string;
    constructor(state: State);
    readSource(source: string, parseTree: Tree): void;
    read(): void;
    readGen(): void;
    readLet(): void;
    readDef(): void;
    readRule(): void;
    readTerm(): Term;
    readParTerm(): Term;
    readPerm(): Term;
    readNat(): number;
    readIdent(): string;
    readRewrite(): void;
}
