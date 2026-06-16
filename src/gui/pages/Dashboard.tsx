import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'wouter';
import { FolderOpen, Plus, Trash2 } from 'lucide-preact';
import { api, type DProject } from 'dododir';
import { currentUser, clearAuth } from '../auth';

export function Dashboard() {
    const [, navigate] = useLocation();
    const [projects, setProjects] = useState<DProject[]>([]);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        setLoading(true);
        try {
            const { projects: remote } = await api.projects.list();
            setProjects(remote);
        } catch {
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    }

    async function createProject(e: Event) {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            const { project } = await api.projects.create(newName.trim());
            setProjects((prev) => [...prev, project]);
            setNewName('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        }
    }

    async function deleteProject(id: string) {
        if (!confirm('Delete this project and all its files?')) return;
        try {
            await api.projects.delete(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
        }
    }

    async function togglePublic(id: string, current: boolean) {
        try {
            const { project } = await api.projects.update(id, { isPublic: !current });
            setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update project');
        }
    }

    function signOut() {
        clearAuth();
        navigate('/login');
    }

    return (
        <div class="dashboard">
            <header class="dashboard-header">
                <h1>dododir</h1>
                <div class="header-right">
                    <span class="user-name">{currentUser.value?.displayName}</span>
                    <button class="btn-ghost" onClick={signOut}>Sign out</button>
                </div>
            </header>

            <main class="dashboard-main">
                <form class="new-project-form" onSubmit={createProject}>
                    <input
                        type="text"
                        placeholder="New project name…"
                        value={newName}
                        onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
                    />
                    <button type="submit" disabled={!newName.trim()}><Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Create</button>
                </form>

                {error && <p class="error-banner">{error}</p>}

                {loading ? (
                    <p>Loading…</p>
                ) : projects.length === 0 ? (
                    <p class="empty-state">No projects yet. Create one above.</p>
                ) : (
                    <ul class="project-list">
                        {projects.map((p) => (
                            <li key={p.id} class="project-card">
                                <button class="project-name" onClick={() => navigate(`/${currentUser.value!.username}/${encodeURIComponent(p.name)}`)}>
                                    <FolderOpen size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />{p.name}
                                </button>
                                {p.description && <p class="project-desc">{p.description}</p>}
                                <label class="public-toggle" title={p.isPublic ? 'Public — click to make private' : 'Private — click to make public'}>
                                    <input
                                        type="checkbox"
                                        checked={p.isPublic}
                                        onChange={() => togglePublic(p.id, p.isPublic)}
                                    />
                                    <span class="public-toggle-track" />
                                    <span class="public-toggle-label">{p.isPublic ? 'Public' : 'Private'}</span>
                                </label>
                                <button
                                    class="btn-danger-ghost"
                                    onClick={() => deleteProject(p.id)}
                                    title="Delete project"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
