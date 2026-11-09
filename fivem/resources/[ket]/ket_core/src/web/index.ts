import type { AuthMode } from '@shared/common/types.ts';
import { byId } from '@shared/web/dom.ts';
import { onNuiMessage, postNui } from '@shared/web/nui.ts';
import type { CoreNuiMessage, SubmitRequest, SubmitResponse } from '../common/nui.ts';

const form = byId<HTMLFormElement>('auth-form');
const username = byId<HTMLInputElement>('username');
const email = byId<HTMLInputElement>('email');
const password = byId<HTMLInputElement>('password');
const emailField = byId('email-field');
const submitButton = byId<HTMLButtonElement>('submit-button');
const status = byId('status');
const tabs = { login: byId('login-tab'), register: byId('register-tab') };
const title = byId('form-title');
const subtitle = byId('form-subtitle');

const COPY = {
    login: { title: 'Welcome back', subtitle: 'Sign in to continue your journey.', submit: 'Sign in', busy: 'Signing in…' },
    register: { title: 'Join the city', subtitle: 'Create your account and start your story.', submit: 'Create account', busy: 'Creating account…' },
} as const;

let mode: AuthMode = 'login';
let submitting = false;

function setStatus(message: string, success = false): void {
    status.textContent = message;
    status.classList.toggle('success', success);
}

function setBusy(busy: boolean): void {
    submitting = busy;
    submitButton.disabled = busy;
    submitButton.textContent = busy ? COPY[mode].busy : COPY[mode].submit;
}

function setMode(next: AuthMode): void {
    mode = next;
    const registering = mode === 'register';
    for (const [key, tab] of Object.entries(tabs)) {
        tab.classList.toggle('active', key === mode);
        tab.setAttribute('aria-selected', String(key === mode));
    }
    emailField.classList.toggle('hidden', !registering);
    email.required = registering;
    username.placeholder = registering ? 'Choose a username' : 'Your username';
    password.autocomplete = registering ? 'new-password' : 'current-password';
    password.minLength = registering ? 10 : 1;
    password.placeholder = registering ? 'At least 10 characters' : 'Your password';
    title.textContent = COPY[mode].title;
    subtitle.textContent = COPY[mode].subtitle;
    setBusy(false);
    setStatus('');
}

tabs.login.addEventListener('click', () => setMode('login'));
tabs.register.addEventListener('click', () => setMode('register'));

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    setStatus('');
    if (!form.reportValidity()) return;

    setBusy(true);
    const request: SubmitRequest = {
        mode,
        username: username.value,
        email: mode === 'register' ? email.value : '',
        password: password.value,
    };
    try {
        const result = await postNui<SubmitResponse>('submit', request);
        setStatus(result.message, result.ok);
        if (result.ok) return; // stays disabled while the world loads
    } catch {
        setStatus('Could not reach the server. Please try again.');
    }
    setBusy(false);
});

onNuiMessage<CoreNuiMessage>({
    open: () => {
        document.body.classList.add('visible');
        setBusy(false);
        password.value = '';
        username.focus();
    },
    close: () => document.body.classList.remove('visible'),
    error: ({ message }) => {
        setBusy(false);
        setStatus(message);
    },
});
