import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useLocation, useParams } from 'wouter';
import { api } from 'dododir';
import { FileTree } from '../components/FileTree';
import { TabBar } from '../components/TabBar';
import { ChypEditor } from '../components/ChypEditor';
export function EditorPage() {
    const { username, projectname } = useParams();
    const [, navigate] = useLocation();
    const [projectId, setProjectId] = useState('');
    const [files, setFiles] = useState([]);
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [contentMap, setContentMap] = useState({});
    const [projectName, setProjectName] = useState('');
    const [error, setError] = useState(null);
    const saveTimers = useRef({});
    const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
    const dirtyPaths = new Set(tabs.filter((t) => t.dirty).map((t) => t.path));
    useEffect(() => {
        if (!username || !projectname)
            return;
        api.projects.getBySlug(username, decodeURIComponent(projectname))
            .then(({ project }) => {
            setProjectId(project.id);
            setProjectName(project.name);
        })
            .catch(() => setError('Project not found'));
    }, [username, projectname]);
    useEffect(() => {
        if (!projectId)
            return;
        loadFiles();
    }, [projectId]);
    async function loadFiles() {
        try {
            const { files } = await api.files.list(projectId);
            setFiles(files);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load files');
        }
    }
    function openFile(file) {
        if (file.isDirectory)
            return;
        const existing = tabs.find((t) => t.id === file.id);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }
        const name = file.path.split('/').pop() ?? file.path;
        const content = file.content ?? '';
        setTabs((prev) => [...prev, { id: file.id, path: file.path, name, dirty: false }]);
        setContentMap((prev) => ({ ...prev, [file.id]: content }));
        setActiveTabId(file.id);
    }
    const saveFile = useCallback(async (fileId, content) => {
        try {
            await api.files.update(projectId, fileId, { content });
            setTabs((prev) => prev.map((t) => (t.id === fileId ? { ...t, dirty: false } : t)));
        }
        catch {
            // Save failed — tab stays dirty
        }
    }, [projectId]);
    const handleChange = useCallback((value) => {
        if (!activeTabId)
            return;
        setContentMap((prev) => ({ ...prev, [activeTabId]: value }));
        setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, dirty: true } : t)));
        if (saveTimers.current[activeTabId])
            clearTimeout(saveTimers.current[activeTabId]);
        saveTimers.current[activeTabId] = setTimeout(() => saveFile(activeTabId, value), 1000);
    }, [activeTabId, saveFile]);
    function closeTab(tabId) {
        if (saveTimers.current[tabId]) {
            clearTimeout(saveTimers.current[tabId]);
            delete saveTimers.current[tabId];
        }
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== tabId);
            if (activeTabId === tabId) {
                setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
            }
            return next;
        });
        setContentMap((prev) => {
            const copy = { ...prev };
            delete copy[tabId];
            return copy;
        });
    }
    async function handleCreateFile(parentPath, isDirectory) {
        const rawName = prompt(isDirectory ? 'Folder name:' : 'File name:');
        if (!rawName?.trim())
            return;
        const base = parentPath === '/' ? '' : parentPath;
        const path = `${base}/${rawName.trim()}`;
        try {
            await api.files.create(projectId, { path, isDirectory, content: null });
            await loadFiles();
        }
        catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to create file');
        }
    }
    async function handleRenameFile(file) {
        const currentRelPath = file.path.replace(/^\//, '');
        const input = prompt('New path:', currentRelPath);
        if (!input?.trim())
            return;
        const newPath = '/' + input.trim().replace(/^\//, '');
        if (newPath === file.path)
            return;
        try {
            await api.files.update(projectId, file.id, { path: newPath });
            const newName = newPath.split('/').pop() ?? newPath;
            setTabs((prev) => prev.map((t) => (t.id === file.id ? { ...t, path: newPath, name: newName } : t)));
            await loadFiles();
        }
        catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to rename');
        }
    }
    async function handleDeleteFile(file) {
        if (!confirm(`Delete ${file.path}?`))
            return;
        try {
            await api.files.delete(projectId, file.id);
            closeTab(file.id);
            await loadFiles();
        }
        catch (e) {
            alert(e instanceof Error ? e.message : 'Failed to delete file');
        }
    }
    if (error)
        return _jsx("p", { class: "error-banner", children: error });
    const activeContent = activeTabId ? (contentMap[activeTabId] ?? '') : '';
    const activeFilename = activeTab?.name ?? '';
    return (_jsxs("div", { class: "editor-layout", children: [_jsxs("div", { class: "editor-sidebar", children: [_jsx("div", { class: "sidebar-header", children: _jsxs("button", { class: "btn-ghost back-btn", onClick: () => navigate('/dashboard'), children: ["\u2190 ", projectName] }) }), _jsx(FileTree, { files: files, openFilePath: activeTab?.path ?? null, dirtyPaths: dirtyPaths, onOpenFile: openFile, onCreateFile: handleCreateFile, onRenameFile: handleRenameFile, onDeleteFile: handleDeleteFile })] }), _jsxs("div", { class: "editor-main", children: [_jsx(TabBar, { tabs: tabs, activeId: activeTabId, onActivate: setActiveTabId, onClose: closeTab }), activeTab ? (_jsx(ChypEditor, { filename: activeFilename, content: activeContent, onChange: handleChange }, activeTabId)) : (_jsx("div", { class: "editor-empty", children: "Open a file from the sidebar" }))] })] }));
}
