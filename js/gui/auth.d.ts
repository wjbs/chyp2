import type { DUser } from 'dododir';
export declare const currentUser: import("@preact/signals-core").Signal<DUser | null>;
export declare const authToken: import("@preact/signals-core").Signal<string | null>;
export declare const isAuthenticated: import("@preact/signals-core").ReadonlySignal<boolean>;
export declare function setAuth(token: string, user: DUser): void;
export declare function clearAuth(): void;
