import { Tree, TreeCursor } from "@lezer/common";
import type { State } from "./state";

export function logTree(parseTree: Tree) {
    let indent = 0;
    parseTree.iterate({
        enter(node) {
            console.log(" ".repeat(indent), node.type.name);
            indent += 2;
        },
        leave(_node) {
            indent -= 2;
        }
    });
}

export class ChypReader {
    state: State;
    c: TreeCursor | null = null;
    source: string = "";

    constructor(state: State) {
        this.state = state;
    }

    readSource(source: string, parseTree: Tree): void {
        this.source = source;
        this.c = parseTree.cursor();
        this.read();
    }

    read(): void {
        if (!this.c) return;
        console.log("entering:", this.c.node.type.name);

        switch (this.c.node.type.name) {
            case "Gen": {
                this.readGen();
                break;
            }
            case "Let": {
                this.readLet();
                break;
            }
            case "Def": {
                this.readDef();
                break;
            }
            case "Rule": {
                this.readRule();
                break;
            }
            default: {
                if (this.c.firstChild()) {
                    do {
                        this.read();
                    } while (this.c.nextSibling());
                    this.c.parent();
                }
            }
        }
        console.log("leaving:", this.c.node.type.name);
    }

    readGen(): void {
        if (!this.c) return;
        this.c.firstChild(); // gen
        this.c.nextSibling(); // name
        const name = this.readIdent();
        console.log("gen name:", name);
        this.c.nextSibling(); // colon
        this.c.nextSibling(); // source arity
        const sourceArity = this.readNat();
        console.log("source arity:", sourceArity);
        this.c.nextSibling(); // arrow
        this.c.nextSibling(); // target arity
        const targetArity = this.readNat();
        console.log("target arity:", targetArity);
        // TODO: colors
        this.c.parent();
    }
    readLet(): void {
    }
    readDef(): void {
    }
    readRule(): void {
    }

    readNat(): number {
        if (!this.c) return 0;
        const s = this.source.slice(this.c.node.from, this.c.node.to);
        // console.log("reading nat from:", s);
        const n = parseInt(s);
        return n;
    }

    readIdent(): string {
        if (!this.c) return "";
        const s = this.source.slice(this.c.node.from, this.c.node.to);
        // console.log("reading ident from:", s);
        return s;
    }
}