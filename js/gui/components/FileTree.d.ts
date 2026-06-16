import type { DFile } from 'dododir';
interface Props {
    files: DFile[];
    openFilePath: string | null;
    dirtyPaths: Set<string>;
    onOpenFile: (file: DFile) => void;
    onCreateFile: (parentPath: string, isDirectory: boolean) => void;
    onRenameFile: (file: DFile) => void;
    onDeleteFile: (file: DFile) => void;
}
export declare function FileTree({ files, openFilePath, dirtyPaths, onOpenFile, onCreateFile, onRenameFile, onDeleteFile, }: Props): import("preact").JSX.Element;
export {};
