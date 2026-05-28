import { createToken, Lexer, CstParser } from "chevrotain";

const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /[ \t\n\r]+/, group: Lexer.SKIPPED });
const Comment = createToken({ name: "Comment", pattern: /#[^\n]*/, group: Lexer.SKIPPED });

// keywords
const Gen = createToken({ name: "Gen", pattern: /gen/ });
const Def = createToken({ name: "Def", pattern: /def/ });
const Let = createToken({ name: "Let", pattern: /let/ });
const Show = createToken({ name: "Show", pattern: /show/ });
const Rule = createToken({ name: "Rule", pattern: /rule/ });
const Rewrite = createToken({ name: "Rewrite", pattern: /rewrite/ });
const By = createToken({ name: "By", pattern: /by/ });
const As = createToken({ name: "As", pattern: /as/ });
const Import = createToken({ name: "Import", pattern: /import/ });
const Sw = createToken({ name: "Sw", pattern: /sw/ });
const Id0 = createToken({ name: "Id0", pattern: /id0/ });
const Id = createToken({ name: "Id", pattern: /id/ });

// symbols
const Colon = createToken({ name: "Colon", pattern: /:/ });
const Question = createToken({ name: "Question", pattern: /\?/ });
const Arrow = createToken({ name: "Arrow", pattern: /->/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });
const Plus = createToken({ name: "Plus", pattern: /\\+/ });
const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
const Star = createToken({ name: "Star", pattern: /\*/ });
const Eq = createToken({ name: "Eq", pattern: /=/ });

// numbers and identifiers
const Nat = createToken({ name: "Nat", pattern: /[0-9]+/ });
const HexColor = createToken({ name: "HexColor", pattern: /\\"[0-9a-fA-F]{6}\\"/ });
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_][a-zA-Z0-9_.]*/ });

const allTokens = [
    WhiteSpace,
    Comment,
    Gen,
    Def,
    Let,
    Show,
    Rule,
    Rewrite,
    By,
    As,
    Import,
    Sw,
    Id0,
    Id,
    Colon,
    Question,
    Arrow,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Comma,
    Minus,
    Plus,
    Semicolon,
    Star,
    Eq,
    Nat,
    HexColor,
    Identifier,
];

export class ParseError extends Error {
    public line: number;
    public column: number;
    public message: string;
    constructor(line: number, column: number, message: string) {
        super(message);
        this.line = line;
        this.column = column;
        this.message = message;
    }
}

export class ChypParser extends CstParser {
    constructor() {
        super(allTokens);
        this.performSelfAnalysis();
    }

    public document = this.RULE("document", () => {
        this.MANY(() => this.SUBRULE(this.statement));
    });

    public term = this.RULE("term", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Semicolon,
            DEF: () => this.SUBRULE(this.parTerm),
        });
    });

    private parTerm = this.RULE("parTerm", () => {
        this.AT_LEAST_ONE_SEP({
            SEP: Star,
            DEF: () => this.SUBRULE(this.atomicTerm),
        });
    });

    private atomicTerm = this.RULE("atomicTerm", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.nestedTerm) },
            { ALT: () => this.SUBRULE(this.perm) },
            { ALT: () => this.CONSUME(Id) },
            { ALT: () => this.CONSUME(Id0) },
            { ALT: () => this.SUBRULE(this.termRef) },
        ]);
    });

    private nestedTerm = this.RULE("nestedTerm", () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.term);
        this.CONSUME(RParen);
    });

    private perm = this.RULE("perm", () => {
        this.CONSUME(Sw);
        this.CONSUME(LBracket);
        this.AT_LEAST_ONE_SEP({
            SEP: Comma,
            DEF: () => this.CONSUME(Nat),
        });
        this.CONSUME(RBracket);
    });

    private statement = this.RULE("statement", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.import) },
            { ALT: () => this.SUBRULE(this.gen) },
            { ALT: () => this.SUBRULE(this.let) },
            { ALT: () => this.SUBRULE(this.def) },
            { ALT: () => this.SUBRULE(this.rule) },
            { ALT: () => this.SUBRULE(this.rewrite) },
            { ALT: () => this.SUBRULE(this.show) },
        ]);
    });

    private import = this.RULE("import", () => {
        this.CONSUME(Import);
        this.CONSUME(Identifier);
        this.OPTION(() => {
            this.CONSUME(As);
            this.SUBRULE(this.var);
        });
        this.OPTION1(() => {
            this.CONSUME(LParen);
            this.MANY_SEP({
                SEP: Comma,
                DEF: () => this.SUBRULE1(this.importLet),
            });
            this.CONSUME(RParen);
        });
    });

    private gen = this.RULE("gen", () => {
        this.CONSUME(Gen);
        this.SUBRULE(this.var);
        this.CONSUME(Colon);
        this.CONSUME(Nat);
        this.CONSUME(Arrow);
        this.CONSUME1(Nat);
        this.OPTION(() => {
            this.SUBRULE(this.genColor);
        });
    });

    private let = this.RULE("let", () => {
        this.CONSUME(Let);
        this.SUBRULE(this.var);
        this.CONSUME(Eq);
        this.SUBRULE(this.term);
    });

    private def = this.RULE("def", () => {
        this.CONSUME(Def);
        this.SUBRULE(this.var);
        this.CONSUME(Eq);
        this.SUBRULE(this.term);
        this.OPTION(() => {
            this.SUBRULE(this.genColor);
        });
    });

    private rule = this.RULE("rule", () => {
        this.CONSUME(Rule);
        this.SUBRULE(this.var);
        this.CONSUME(Colon);
        this.SUBRULE(this.term);
        this.CONSUME(Eq);
        this.SUBRULE1(this.term);
    });

    private rewrite = this.RULE("rewrite", () => {
        this.CONSUME(Rewrite);
        this.SUBRULE(this.var);
        this.CONSUME(Colon);
        this.SUBRULE(this.term);
        this.MANY(() => {
            this.SUBRULE1(this.rewritePart);
        });
    });

    private show = this.RULE("show", () => {
        this.CONSUME(Show);
        this.SUBRULE(this.ruleRef);
    });

    private importLet = this.RULE("importLet", () => {
        this.SUBRULE(this.var);
        this.CONSUME(Eq);
        this.SUBRULE(this.term);
    });

    private genColor = this.RULE("genColor", () => {
        this.CONSUME(HexColor);
        this.OPTION(() => {
            this.CONSUME1(HexColor);
        });
    });

    private rewritePart = this.RULE("rewritePart", () => {
        this.CONSUME(Eq);
        this.SUBRULE(this.termHole);
        this.OPTION(() => {
            this.CONSUME(By);
            this.SUBRULE(this.tactic);
        });
    });

    private termHole = this.RULE("termHole", () => {
        this.OR([
            { ALT: () => this.CONSUME(Question) },
            { ALT: () => this.SUBRULE(this.term) },
        ]);
    });

    private tactic = this.RULE("tactic", () => {
        this.OR([
            { ALT: () => this.CONSUME(Rule) },
            {
                ALT: () => {
                    this.OPTION(() => this.CONSUME(Minus));
                    this.CONSUME(Identifier);
                }
            },
        ]);
        this.CONSUME(LParen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.tacticArg),
        });
        this.CONSUME(RParen);
    });

    private tacticArg = this.RULE("tacticArg", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) },
            ]);
        });
        this.CONSUME(Identifier);
    });

    private var = this.RULE("var", () => {
        this.CONSUME(Identifier);
    });

    private termRef = this.RULE("termRef", () => {
        this.CONSUME(Identifier);
    });

    private ruleRef = this.RULE("ruleRef", () => {
        this.CONSUME(Identifier);
    });
}

export function parseDocument(input: string) {
    const lexer = new Lexer(allTokens);
    const lexResult = lexer.tokenize(input);
    if (lexResult.errors.length > 0) {
        throw new ParseError(
            lexResult.errors[0].line ?? 0,
            lexResult.errors[0].column ?? 0,
            lexResult.errors[0].message);
    }

    const parser = new ChypParser();
    parser.input = lexResult.tokens;
    const cst = parser.document();

    if (parser.errors.length > 0) {
        throw new ParseError(
            parser.errors[0].token.startLine ?? 0,
            parser.errors[0].token.startColumn ?? 0,
            parser.errors[0].message);
    }

    return cst;
}