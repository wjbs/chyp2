import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'wouter';
import { FolderOpen, Plus, Trash2 } from 'lucide-preact';
import { api } from 'dododir';
import { currentUser, clearAuth } from '../auth';
export function Dashboard() {
    const [, navigate] = useLocation();
    const [projects, setProjects] = useState([]);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadProjects();
    }, []);
    async function loadProjects() {
        setLoading(true);
        try {
            const { projects: remote } = await api.projects.list();
            setProjects(remote);
        }
        catch {
            setError('Failed to load projects');
        }
        finally {
            setLoading(false);
        }
    }
    async function createProject(e) {
        e.preventDefault();
        if (!newName.trim())
            return;
        try {
            const { project } = await api.projects.create(newName.trim());
            setProjects((prev) => [...prev, project]);
            setNewName('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        }
    }
    async function deleteProject(id) {
        if (!confirm('Delete this project and all its files?'))
            return;
        try {
            await api.projects.delete(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
        }
    }
    async function togglePublic(id, current) {
        try {
            const { project } = await api.projects.update(id, { isPublic: !current });
            setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update project');
        }
    }
    function signOut() {
        clearAuth();
        navigate('/login');
    }
    return (_jsxs("div", { class: "dashboard", children: [_jsxs("header", { class: "dashboard-header", children: [_jsx("h1", { children: "dododir" }), _jsxs("div", { class: "header-right", children: [_jsx("span", { class: "user-name", children: currentUser.value?.displayName }), _jsx("button", { class: "btn-ghost", onClick: signOut, children: "Sign out" })] })] }), _jsxs("main", { class: "dashboard-main", children: [_jsxs("form", { class: "new-project-form", onSubmit: createProject, children: [_jsx("input", { type: "text", placeholder: "New project name\u2026", value: newName, onInput: (e) => setNewName(e.target.value) }), _jsxs("button", { type: "submit", disabled: !newName.trim(), children: [_jsx(Plus, { size: 14, style: { verticalAlign: 'middle', marginRight: 4 } }), "Create"] })] }), error && _jsx("p", { class: "error-banner", children: error }), loading ? (_jsx("p", { children: "Loading\u2026" })) : projects.length === 0 ? (_jsx("p", { class: "empty-state", children: "No projects yet. Create one above." })) : (_jsx("ul", { class: "project-list", children: projects.map((p) => (_jsxs("li", { class: "project-card", children: [_jsxs("button", { class: "project-name", onClick: () => navigate(`/${currentUser.value.username}/${encodeURIComponent(p.name)}`), children: [_jsx(FolderOpen, { size: 15, style: { verticalAlign: 'middle', marginRight: 6 } }), p.name] }), p.description && _jsx("p", { class: "project-desc", children: p.description }), _jsxs("label", { class: "public-toggle", title: p.isPublic ? 'Public — click to make private' : 'Private — click to make public', children: [_jsx("input", { type: "checkbox", checked: p.isPublic, onChange: () => togglePublic(p.id, p.isPublic) }), _jsx("span", { class: "public-toggle-track" }), _jsx("span", { class: "public-toggle-label", children: p.isPublic ? 'Public' : 'Private' })] }), _jsx("button", { class: "btn-danger-ghost", onClick: () => deleteProject(p.id), title: "Delete project", children: _jsx(Trash2, { size: 15 }) })] }, p.id))) }))] })] }));
}
