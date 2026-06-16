import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'wouter';
import { api } from 'dododir';
import { setAuth } from '../auth';

declare global {
    interface Window {
        turnstile: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string;
                    callback: (token: string) => void;
                    'expired-callback': () => void;
                    'error-callback': () => void;
                },
            ) => string;
            remove: (widgetId: string) => void;
        };
    }
}

interface Props {
    mode: 'login' | 'register';
}

export function AuthForm({ mode }: Props) {
    const [, navigate] = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const widgetRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (mode !== 'register' || !widgetRef.current) return;
        const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
        widgetId.current = window.turnstile.render(widgetRef.current, {
            sitekey,
            callback: (token: string) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(null),
            'error-callback': () => setCaptchaToken(null),
        });
        return () => {
            if (widgetId.current !== undefined) {
                window.turnstile.remove(widgetId.current);
                widgetId.current = undefined;
            }
        };
    }, [mode]);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result =
                mode === 'register'
                    ? await api.auth.register(username, password, displayName, captchaToken!)
                    : await api.auth.login(username, password);
            setAuth(result.token, result.user);
            navigate('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div class="auth-page">
            <div class="auth-card">
                <h1>{mode === 'register' ? 'Create account' : 'Sign in'}</h1>
                <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <label>
                            Display name
                            <input
                                type="text"
                                value={displayName}
                                onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                                required
                                autocomplete="name"
                            />
                        </label>
                    )}
                    <label>
                        Username
                        <input
                            type="text"
                            value={username}
                            onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
                            required
                            autocomplete="username"
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                            required
                            minLength={8}
                            autocomplete={mode === 'register' ? 'new-password' : 'current-password'}
                        />
                    </label>
                    {mode === 'register' && <div ref={widgetRef} />}
                    {error && <p class="auth-error">{error}</p>}
                    {/* OAuth buttons can be added here in the future */}
                    <button type="submit" disabled={loading || (mode === 'register' && !captchaToken)}>
                        {loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
                    </button>
                </form>
                <p class="auth-switch">
                    {mode === 'register' ? (
                        <>Already have an account? <a href="/login">Sign in</a></>
                    ) : (
                        <>No account? <a href="/register">Create one</a></>
                    )}
                </p>
            </div>
        </div>
    );
}
