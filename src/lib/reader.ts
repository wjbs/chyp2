import { Tree, TreeCursor } from "@lezer/common";
import { GenPart, LetPart, DefPart, RulePart, RewritePart, State } from "./state";
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
            case "Rewrite": {
                this.readRewrite();
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
        const part = new GenPart(this.c.node.from, this.c.node.to);
        this.c.firstChild(); // gen
        this.c.nextSibling(); // name
        part.name = this.readIdent();
        this.c.nextSibling(); // colon
        this.c.nextSibling(); // source arity
        part.inputArity = this.readNat();
        this.c.nextSibling(); // arrow
        this.c.nextSibling(); // target arity
        part.outputArity = this.readNat();
        // TODO: colors
        this.c.parent();

        this.state.addPart(part);
        // console.log(`read gen: ${part.name} : ${part.inputArity} -> ${part.outputArity}`);
    }

    readLet(): void {
        if (!this.c) return;
        const part = new LetPart(this.c.node.from, this.c.node.to);
        this.c.firstChild(); // let
        this.c.nextSibling(); // name
        part.name = this.readIdent();
        this.c.nextSibling(); // eq
        this.c.nextSibling(); // term
        part.term = this.readTerm();
        this.c.parent();

        this.state.addPart(part);
        // console.log(`read let: ${part.name} = ${part.term.toString()}`);
    }

    readDef(): void {
        if (!this.c) return;
        const part = new DefPart(this.c.node.from, this.c.node.to);

        this.c.firstChild(); // def
        this.c.nextSibling(); // name
        part.name = this.readIdent();
        this.c.nextSibling(); // eq
        this.c.nextSibling(); // term
        part.term = this.readTerm();
        // TODO: colors
        this.c.parent();

        this.state.addPart(part);
        // console.log(`read def: ${part.name} = ${part.term.toString()}`);
    }

    readRule(): void {
        if (!this.c) return;
        const part = new RulePart(this.c.node.from, this.c.node.to);

        this.c.firstChild(); // rule
        this.c.nextSibling(); // name
        part.name = this.readIdent();
        this.c.nextSibling(); // colon
        this.c.nextSibling(); // lhs term
        part.lhsTerm = this.readTerm();
        this.c.nextSibling(); // eq
        this.c.nextSibling(); // rhs term
        part.rhsTerm = this.readTerm();
        this.c.parent();

        this.state.addPart(part);
        // console.log(`read rule: ${part.name} : ${part.lhsTerm.toString()} = ${part.rhsTerm.toString()}`);
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

    readRewrite(): void {
        if (!this.c) return;
        const firstPart = new RewritePart(this.c.node.from, this.c.node.to);
        this.c.firstChild(); // rewrite
        this.c.nextSibling(); // name
        firstPart.name = this.readIdent();
        this.c.nextSibling(); // colon
        this.c.nextSibling(); // term
        firstPart.lhsTerm = this.readTerm();

        if (!this.c.nextSibling()) { // if no RewriteParts, add a stub and return
            this.state.addPart(firstPart);
            this.c.parent();
            return;
        }

        let first = true;
        let currentTerm: Term | null = null;

        let part: RewritePart;
        do {
            if (first) {
                part = firstPart;
                part.end = this.c.node.to;
                first = false;
            } else {
                part = new RewritePart(this.c.node.from, this.c.node.to);
                part.name = firstPart.name;
                part.lhsTerm = currentTerm;
            }

            this.c.firstChild(); // eq
            this.c.nextSibling(); // TermHole
            this.c.firstChild(); // term or Question
            if (this.c.node.type.name === "Term") {
                part.rhsTerm = this.readTerm();
            }
            this.c.parent();
            currentTerm = part.rhsTerm;

            // TODO: read tactic and args

            this.state.addPart(part);
            this.c.parent();
        } while (this.c.nextSibling()); // loop over RewriteParts

        // the last part should store the theorem LHS, signalling it
        // should store the theorem "first LHS" = "current RHS" if successful
        part.firstLhsTerm = firstPart.lhsTerm;

        this.c.parent();
    }
}