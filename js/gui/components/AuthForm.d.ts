declare global {
    interface Window {
        turnstile: {
            render: (container: HTMLElement, options: {
                sitekey: string;
                callback: (token: string) => void;
                'expired-callback': () => void;
                'error-callback': () => void;
            }) => string;
            remove: (widgetId: string) => void;
        };
    }
}
interface Props {
    mode: 'login' | 'register';
}
export declare function AuthForm({ mode }: Props): import("preact").JSX.Element;
export {};
