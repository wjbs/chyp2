import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { useState } from 'preact/hooks';
import { ChevronDown, ChevronRight, FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-preact';
function buildTree(files) {
    const root = [];
    const map = new Map();
    // Sort: directories first, then alphabetically
    const sorted = [...files].sort((a, b) => {
        if (a.isDirectory !== b.isDirectory)
            return a.isDirectory ? -1 : 1;
        return a.path.localeCompare(b.path);
    });
    for (const file of sorted) {
        if (file.path === '/')
            continue; // skip virtual root dir entry
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
export function FileTree({ files, openFilePath, dirtyPaths, onOpenFile, onCreateFile, onRenameFile, onDeleteFile, }) {
    const tree = buildTree(files);
    return (_jsxs("nav", { class: "file-tree", children: [_jsxs("div", { class: "file-tree-header", children: [_jsx("span", { children: "Files" }), _jsx("button", { class: "btn-icon", title: "New file", onClick: () => onCreateFile('/', false), children: _jsx(FilePlus, { size: 14 }) }), _jsx("button", { class: "btn-icon", title: "New folder", onClick: () => onCreateFile('/', true), children: _jsx(FolderPlus, { size: 14 }) })] }), _jsx(TreeNodeList, { nodes: tree, openFilePath: openFilePath, dirtyPaths: dirtyPaths, onOpenFile: onOpenFile, onCreateFile: onCreateFile, onRenameFile: onRenameFile, onDeleteFile: onDeleteFile, depth: 0 })] }));
}
function TreeNodeList({ nodes, depth, ...rest }) {
    return (_jsx("ul", { class: "tree-list", style: { paddingLeft: depth === 0 ? 0 : '1rem' }, children: nodes.map((node) => (_jsx(TreeItem, { node: node, depth: depth, ...rest }, node.path))) }));
}
function TreeItem({ node, openFilePath, dirtyPaths, onOpenFile, onCreateFile, onRenameFile, onDeleteFile, depth }) {
    const [expanded, setExpanded] = useState(true);
    const isActive = openFilePath === node.path;
    const isDirty = dirtyPaths.has(node.path);
    function handleClick() {
        if (node.isDirectory) {
            setExpanded((v) => !v);
        }
        else if (node.file) {
            onOpenFile(node.file);
        }
    }
    return (_jsxs("li", { class: `tree-item${isActive ? ' active' : ''}`, children: [_jsxs("div", { class: "tree-item-row", style: { paddingLeft: `${depth * 0.75}rem` }, children: [_jsxs("button", { class: "tree-item-btn", onClick: handleClick, children: [node.isDirectory ? (expanded ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 })) : _jsx("span", { style: { display: 'inline-block', width: 12 } }), node.name, _jsx("span", { class: "dirty-dot", title: "Unsaved changes", "aria-hidden": !isDirty, style: { opacity: isDirty ? 1 : 0 } })] }), _jsxs("div", { class: "tree-item-actions", children: [node.isDirectory && (_jsxs(_Fragment, { children: [_jsx("button", { class: "btn-icon", title: "New file", onClick: () => onCreateFile(node.path, false), children: _jsx(FilePlus, { size: 13 }) }), _jsx("button", { class: "btn-icon", title: "New folder", onClick: () => onCreateFile(node.path, true), children: _jsx(FolderPlus, { size: 13 }) })] })), node.file && (_jsxs(_Fragment, { children: [_jsx("button", { class: "btn-icon", title: "Rename", onClick: () => onRenameFile(node.file), children: _jsx(Pencil, { size: 13 }) }), _jsx("button", { class: "btn-icon", title: "Delete", onClick: () => onDeleteFile(node.file), children: _jsx(Trash2, { size: 13 }) })] }))] })] }), node.isDirectory && expanded && node.children.length > 0 && (_jsx(TreeNodeList, { nodes: node.children, openFilePath: openFilePath, dirtyPaths: dirtyPaths, onOpenFile: onOpenFile, onCreateFile: onCreateFile, onRenameFile: onRenameFile, onDeleteFile: onDeleteFile, depth: depth + 1 }))] }));
}
