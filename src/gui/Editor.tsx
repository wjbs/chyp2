import { useEffect, useRef } from 'preact/hooks';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import { Decoration, keymap } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { parser } from "../lib/parser"
import { foldNodeProp, foldInside, indentNodeProp, LRLanguage, LanguageSupport } from "@codemirror/language"
import { styleTags, tags } from "@lezer/highlight"
import { State, Part } from '../lib/state';

const chypLanguage = LRLanguage.define({
    parser: parser.configure({
        props: [
            styleTags({
                Identifier: tags.variableName,
                gen: tags.keyword,
                let: tags.keyword,
                def: tags.keyword,
                rule: tags.keyword,
                show: tags.keyword,
                rewrite: tags.keyword,
                as: tags.keyword,
                by: tags.keyword,
                HexColor: tags.string,
                Comment: tags.lineComment,
                "( )": tags.paren,
            }),
            indentNodeProp.add({
                Application: context => context.column(context.node.from) + context.unit
            }),
            foldNodeProp.add({
                Application: foldInside
            })
        ]
    }),
    languageData: {
        commentTokens: { line: "#" }
    }
});

const setPartsEffect = StateEffect.define<{ parts: Part[]; currentPart: number }>();

const partsField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setPartsEffect)) {
                const builder = new RangeSetBuilder<Decoration>();
                effect.value.parts.forEach((part, i) => {
                    const active = i === effect.value.currentPart;
                    const status =
                        part.status === Part.CHECKING ? 'checking' :
                            part.status === Part.VALID ? 'valid' :
                                part.status === Part.INVALID ? 'invalid' : 'unchecked';
                    const cls = active ? `cm-part-${status}-active` : `cm-part-${status}`;
                    builder.add(part.start, part.end, Decoration.mark({ class: cls }));
                });
                return builder.finish();
            }
        }
        return decorations.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f),
});

const partHighlightTheme = EditorView.baseTheme({
    '.cm-part-unchecked': { backgroundColor: '#f5f5ff' },
    '.cm-part-unchecked-active': { backgroundColor: '#dde8ff' },
    '.cm-part-checking': { backgroundColor: '#ffeeff' },
    '.cm-part-checking-active': { backgroundColor: '#ffccff' },
    '.cm-part-valid': { backgroundColor: '#eeffee' },
    '.cm-part-valid-active': { backgroundColor: '#ccffcc' },
    '.cm-part-invalid': { backgroundColor: '#ffeeee' },
    '.cm-part-invalid-active': { backgroundColor: '#ffcccc' },
});

const disableActiveLineTheme = EditorView.theme({
    '.cm-activeLine': { backgroundColor: 'transparent' },
});

interface EditorProps {
    state: State;
    currentPart: number;
    initialContent?: string;
    onChange?: (content: string | null, pos: number | null) => void;
}

export function Editor({ state, currentPart, initialContent = '', onChange }: EditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const stateRef = useRef(state);
    const currentPartRef = useRef(currentPart);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => { currentPartRef.current = currentPart; }, [currentPart]);

    useEffect(() => {
        if (!containerRef.current) return;
        const partNavKeymap = keymap.of([
            {
                key: 'Ctrl-j',
                run(view) {
                    const parts = stateRef.current.parts;
                    const next = currentPartRef.current + 1;
                    if (next < parts.length) {
                        view.dispatch({ selection: { anchor: parts[next].end } });
                        view.focus();
                    }
                    return true;
                }
            },
            {
                key: 'Ctrl-k',
                run(view) {
                    const parts = stateRef.current.parts;
                    const prev = currentPartRef.current - 1;
                    if (prev >= 0) {
                        view.dispatch({ selection: { anchor: parts[prev].end } });
                        view.focus();
                    }
                    return true;
                }
            },
        ]);

        const extensions = [partNavKeymap, basicSetup, new LanguageSupport(chypLanguage), partsField, partHighlightTheme, disableActiveLineTheme];

        if (onChange) {
            extensions.push(
                EditorView.updateListener.of((update) => {
                    onChangeRef.current?.(
                        update.docChanged ? update.state.doc.toString() : null,
                        update.selectionSet ? update.state.selection.main.head : null
                    );
                })
            );
        }

        const view = new EditorView({
            state: EditorState.create({
                doc: initialContent,
                extensions,
            }),
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            viewRef.current = null;
            view.destroy();
        };
    }, []);

    useEffect(() => {
        if (!viewRef.current) return;
        viewRef.current.dispatch({ effects: setPartsEffect.of({ parts: state.parts, currentPart }) });
    }, [state, currentPart]);

    return (
        <div className="editor-panel">
            <div ref={containerRef} />
        </div>);
}
