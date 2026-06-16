import { Router, Route, Switch, useLocation } from 'wouter';
import { useEffect } from 'preact/hooks';
import type { JSX } from 'preact';
import { api } from 'dododir';
import { currentUser, authToken } from './auth';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { EditorPage } from './pages/EditorPage';

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  if (!authToken.value) {
    window.location.replace('/login');
    return null;
  }
  return <Component />;
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

  return (
    <Router>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/:username/:projectname">
          <EditorPage />
        </Route>
        <Route component={DefaultRedirect} />
      </Switch>
    </Router>
  );
}
