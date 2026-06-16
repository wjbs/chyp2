import { State } from '../../lib/state';
interface EditorProps {
    state: State;
    currentPart: number;
    initialContent?: string;
    onChange?: (content: string | null, pos: number | null) => void;
}
export declare function CodeView({ state, currentPart, initialContent, onChange }: EditorProps): import("preact").JSX.Element;
export {};
