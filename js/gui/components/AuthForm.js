import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'wouter';
import { api } from 'dododir';
import { setAuth } from '../auth';
export function AuthForm({ mode }) {
    const [, navigate] = useLocation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const widgetRef = useRef(null);
    const widgetId = useRef(undefined);
    useEffect(() => {
        if (mode !== 'register' || !widgetRef.current)
            return;
        const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
        widgetId.current = window.turnstile.render(widgetRef.current, {
            sitekey,
            callback: (token) => setCaptchaToken(token),
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
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = mode === 'register'
                ? await api.auth.register(username, password, displayName, captchaToken)
                : await api.auth.login(username, password);
            setAuth(result.token, result.user);
            navigate('/dashboard');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { class: "auth-page", children: _jsxs("div", { class: "auth-card", children: [_jsx("h1", { children: mode === 'register' ? 'Create account' : 'Sign in' }), _jsxs("form", { onSubmit: handleSubmit, children: [mode === 'register' && (_jsxs("label", { children: ["Display name", _jsx("input", { type: "text", value: displayName, onInput: (e) => setDisplayName(e.target.value), required: true, autocomplete: "name" })] })), _jsxs("label", { children: ["Username", _jsx("input", { type: "text", value: username, onInput: (e) => setUsername(e.target.value), required: true, autocomplete: "username" })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: password, onInput: (e) => setPassword(e.target.value), required: true, minLength: 8, autocomplete: mode === 'register' ? 'new-password' : 'current-password' })] }), mode === 'register' && _jsx("div", { ref: widgetRef }), error && _jsx("p", { class: "auth-error", children: error }), _jsx("button", { type: "submit", disabled: loading || (mode === 'register' && !captchaToken), children: loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in' })] }), _jsx("p", { class: "auth-switch", children: mode === 'register' ? (_jsxs(_Fragment, { children: ["Already have an account? ", _jsx("a", { href: "/login", children: "Sign in" })] })) : (_jsxs(_Fragment, { children: ["No account? ", _jsx("a", { href: "/register", children: "Create one" })] })) })] }) }));
}
