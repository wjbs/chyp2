import { useState } from 'preact/hooks';
import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-preact';
import type { DFile } from 'dododir';

interface TreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children: TreeNode[];
    file?: DFile;
}

function buildTree(files: DFile[]): TreeNode[] {
    const root: TreeNode[] = [];
    const map = new Map<string, TreeNode>();

    // Sort: directories first, then alphabetically
    const sorted = [...files].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.path.localeCompare(b.path);
    });

    for (const file of sorted) {
        if (file.path === '/') continue; // skip virtual root dir entry
        const segments = file.path.replace(/^\//, '').split('/');
        let current = root;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const partialPath = '/' + segments.slice(0, i + 1).join('/');
            const isLast = i === segments.length - 1;

            let node = map.get(partialPath);
            if (!node) {
                node = {
                    name: segment,
                    path: partialPath,
                    isDirectory: isLast ? file.isDirectory : true,
                    children: [],
                    file: isLast ? file : undefined,
                };
                map.set(partialPath, node);
                current.push(node);
            }
            current = node.children;
        }
    }

    return root;
}

interface Props {
    files: DFile[];
    openFilePath: string | null;
    dirtyPaths: Set<string>;
    onOpenFile: (file: DFile) => void;
    onCreateFile: (parentPath: string, isDirectory: boolean) => void;
    onRenameFile: (file: DFile) => void;
    onDeleteFile: (file: DFile) => void;
}

export function FileTree({
    files,
    openFilePath,
    dirtyPaths,
    onOpenFile,
    onCreateFile,
    onRenameFile,
    onDeleteFile,
}: Props) {
    const tree = buildTree(files);
    return (
        <nav class="file-tree">
            <div class="file-tree-header">
                <span>Files</span>
                <button
                    class="btn-icon"
                    title="New file"
                    onClick={() => onCreateFile('/', false)}
                ><FilePlus size={14} /></button>
                <button
                    class="btn-icon"
                    title="New folder"
                    onClick={() => onCreateFile('/', true)}
                ><FolderPlus size={14} /></button>
            </div>
            <TreeNodeList
                nodes={tree}
                openFilePath={openFilePath}
                dirtyPaths={dirtyPaths}
                onOpenFile={onOpenFile}
                onCreateFile={onCreateFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                depth={0}
            />
        </nav>
    );
}

interface NodeListProps {
    nodes: TreeNode[];
    openFilePath: string | null;
    dirtyPaths: Set<string>;
    onOpenFile: (file: DFile) => void;
    onCreateFile: (parentPath: string, isDirectory: boolean) => void;
    onRenameFile: (file: DFile) => void;
    onDeleteFile: (file: DFile) => void;
    depth: number;
}

function TreeNodeList({ nodes, depth, ...rest }: NodeListProps) {
    return (
        <ul class="tree-list" style={{ paddingLeft: depth === 0 ? 0 : '1rem' }}>
            {nodes.map((node) => (
                <TreeItem key={node.path} node={node} depth={depth} {...rest} />
            ))}
        </ul>
    );
}

interface ItemProps extends Omit<NodeListProps, 'nodes'> {
    node: TreeNode;
}

function TreeItem({ node, openFilePath, dirtyPaths, onOpenFile, onCreateFile, onRenameFile, onDeleteFile, depth }: ItemProps) {
    const [expanded, setExpanded] = useState(true);
    const isActive = openFilePath === node.path;
    const isDirty = dirtyPaths.has(node.path);

    function handleClick() {
        if (node.isDirectory) {
            setExpanded((v) => !v);
        } else if (node.file) {
            onOpenFile(node.file);
        }
    }

    return (
        <li class={`tree-item${isActive ? ' active' : ''}`}>
            <div class="tree-item-row" style={{ paddingLeft: `${depth * 0.75}rem` }}>
                <button class="tree-item-btn" onClick={handleClick}>
                    {node.isDirectory ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span style={{ display: 'inline-block', width: 12 }} />}
                    {node.name}
                    <span class="dirty-dot" title="Unsaved changes" aria-hidden={!isDirty} style={{ opacity: isDirty ? 1 : 0 }} />
                </button>
                <div class="tree-item-actions">
                    {node.isDirectory && (
                        <>
                            <button class="btn-icon" title="New file" onClick={() => onCreateFile(node.path, false)}><FilePlus size={13} /></button>
                            <button class="btn-icon" title="New folder" onClick={() => onCreateFile(node.path, true)}><FolderPlus size={13} /></button>
                        </>
                    )}
                    {node.file && (
                        <>
                            <button class="btn-icon" title="Rename" onClick={() => onRenameFile(node.file!)}><Pencil size={13} /></button>
                            <button class="btn-icon" title="Delete" onClick={() => onDeleteFile(node.file!)}><Trash2 size={13} /></button>
                        </>
                    )}
                </div>
            </div>
            {node.isDirectory && expanded && node.children.length > 0 && (
                <TreeNodeList
                    nodes={node.children}
                    openFilePath={openFilePath}
                    dirtyPaths={dirtyPaths}
                    onOpenFile={onOpenFile}
                    onCreateFile={onCreateFile}
                    onRenameFile={onRenameFile}
                    onDeleteFile={onDeleteFile}
                    depth={depth + 1}
                />
            )}
        </li>
    );
}
