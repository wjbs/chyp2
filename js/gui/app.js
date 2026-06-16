import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { Router, Route, Switch, useLocation } from 'wouter';
import { useEffect } from 'preact/hooks';
import { api } from 'dododir';
import { currentUser, authToken } from './auth';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { EditorPage } from './pages/EditorPage';
function ProtectedRoute({ component: Component }) {
    if (!authToken.value) {
        window.location.replace('/login');
        return null;
    }
    return _jsx(Component, {});
}
function DefaultRedirect() {
    const [, navigate] = useLocation();
    useEffect(() => {
        navigate(authToken.value ? '/dashboard' : '/login', { replace: true });
    }, []);
    return null;
}
export function App() {
    // Re-hydrate user from stored token on first load
    useEffect(() => {
        if (authToken.value && !currentUser.value) {
            api.auth.me()
                .then(({ user }) => { currentUser.value = user; })
                .catch(() => {
                localStorage.removeItem('token');
                authToken.value = null;
            });
        }
    }, []);
    return (_jsx(Router, { children: _jsxs(Switch, { children: [_jsx(Route, { path: "/login", component: Login }), _jsx(Route, { path: "/register", component: Register }), _jsx(Route, { path: "/dashboard", children: _jsx(ProtectedRoute, { component: Dashboard }) }), _jsx(Route, { path: "/:username/:projectname", children: _jsx(EditorPage, {}) }), _jsx(Route, { component: DefaultRedirect })] }) }));
}
