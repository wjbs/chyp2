import { Tree, TreeCursor } from "@lezer/common";
import { Graph } from "./graph";
import { GraphPart, type State } from "./state";
import { Term, Atom, Par, Seq, Perm } from "./term";

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
        // console.log("entering:", this.c.node.type.name);

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
        // console.log("leaving:", this.c.node.type.name);
    }

    readGen(): void {
        if (!this.c) return;
        const part = new GraphPart(this.c.node.from, this.c.node.to);
        this.c.firstChild(); // gen
        this.c.nextSibling(); // name
        const name = this.readIdent();
        this.c.nextSibling(); // colon
        this.c.nextSibling(); // source arity
        const sourceArity = this.readNat();
        this.c.nextSibling(); // arrow
        this.c.nextSibling(); // target arity
        const targetArity = this.readNat();
        // TODO: colors
        this.c.parent();

        part.lhs = Graph.gen(name, sourceArity, targetArity);
        this.state.addPart(part);
        console.log(`read gen: ${name} : ${sourceArity} -> ${targetArity}`);
    }
    readLet(): void {
        if (!this.c) return;
        const part = new GraphPart(this.c.node.from, this.c.node.to);
        this.c.firstChild(); // let
        this.c.nextSibling(); // name
        const name = this.readIdent();
        this.c.nextSibling(); // eq
        this.c.nextSibling(); // term
        const t = this.readTerm();
        this.c.parent();

        this.state.addPart(part);
        console.log(`read let: ${name} = ${t.toString()}`);
    }

    readDef(): void {
        if (!this.c) return;
        const part = new GraphPart(this.c.node.from, this.c.node.to);

        this.c.firstChild(); // def
        this.c.nextSibling(); // name
        const name = this.readIdent();
        this.c.nextSibling(); // eq
        this.c.nextSibling(); // term
        const t = this.readTerm();
        // TODO: colors
        this.c.parent();

        this.state.addPart(part);
        console.log(`read def: ${name} = ${t.toString()}`);
    }

    readRule(): void {
        if (!this.c) return;
        const part = new GraphPart(this.c.node.from, this.c.node.to);

        this.c.firstChild(); // rule
        this.c.nextSibling(); // name
        const name = this.readIdent();
        this.c.nextSibling(); // colon
        this.c.nextSibling(); // lhs term
        const lhs = this.readTerm();
        this.c.nextSibling(); // eq
        this.c.nextSibling(); // rhs term
        const rhs = this.readTerm();
        this.c.parent();

        this.state.addPart(part);
        console.log(`read rule: ${name} : ${lhs.toString()} = ${rhs.toString()}`);
    }

    readTerm(): Term {
        if (!this.c) return new Term();
        const t = new Seq();

        this.c.firstChild();
        do {
            t.children.push(this.readParTerm());
            this.c.nextSibling(); // semicolon or end
        } while (this.c.nextSibling());
        this.c.parent();

        if (t.children.length === 1) {
            return t.children[0];
        }
        return t;
    }

    readParTerm(): Term {
        if (!this.c) return new Term();
        const t = new Par();

        this.c.firstChild();
        do {
            switch (this.c.node.type.name) {
                case "TermRef":
                case "id":
                case "id0": {
                    t.children.push(new Atom(this.readIdent()));
                    break;
                }
                case "Perm": {
                    t.children.push(this.readPerm());
                    break;
                }
                case "Term": {
                    t.children.push(this.readTerm());
                    break;
                }
                default: {
                    console.warn("unexpected term node:", this.c.node.type.name);
                }
            }
            this.c.nextSibling(); // semicolon or end
        } while (this.c.nextSibling());
        this.c.parent();

        if (t.children.length === 1) {
            return t.children[0];
        }
        return t;
    }

    readPerm(): Term {
        if (!this.c) return new Term();
        const perm: number[] = [];

        this.c.firstChild(); // sw
        while (this.c.nextSibling()) {
            perm.push(this.readNat());
            this.c.nextSibling(); // comma or end
        }
        this.c.parent();

        return new Perm(perm);
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