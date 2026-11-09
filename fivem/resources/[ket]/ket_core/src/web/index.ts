import type { AuthMode } from '@shared/common/types.ts';
import { byId } from '@shared/web/dom.ts';
import { onNuiMessage, postNui } from '@shared/web/nui.ts';
import { BRAND, type CoreNuiMessage, type SubmitRequest, type SubmitResponse } from '../common/nui.ts';

const MIN_PASSWORD = 10;
const REMEMBER_KEY = 'ket_core:lastUsername';

const form = byId<HTMLFormElement>('auth-form');
const username = byId<HTMLInputElement>('username');
const email = byId<HTMLInputElement>('email');
const password = byId<HTMLInputElement>('password');
const emailField = byId('email-field');
const reveal = byId<HTMLButtonElement>('reveal');
const caps = byId('caps');
const strength = byId('strength');
const strengthLabel = byId('strength-label');
const status = byId('status');
const submit = byId<HTMLButtonElement>('submit');
const submitLabel = byId('submit-label');
const tabs: Record<AuthMode, HTMLElement> = { login: byId('tab-login'), register: byId('tab-register') };

const COPY = {
    login: { title: 'Welcome back', subtitle: 'Sign in to continue your story in Los Santos.', submit: 'Sign in', busy: 'Signing in…' },
    register: { title: 'Join the city', subtitle: 'Create an account to start your story.', submit: 'Create account', busy: 'Creating account…' },
} as const;

let mode: AuthMode = 'login';
let busy = false;

// Branding is decorative: fill in whichever brand elements the markup has (either may be removed).
for (const [id, text] of [['brand-name', BRAND.name], ['brand-tagline', BRAND.tagline]] as const) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

const storage = {
    get: () => {
        try {
            return localStorage.getItem(REMEMBER_KEY) ?? '';
        } catch {
            return '';
        }
    },
    set: (value: string) => {
        try {
            localStorage.setItem(REMEMBER_KEY, value);
        } catch {
            // storage unavailable: nothing to remember
        }
    },
};

function setStatus(message: string, success = false): void {
    status.hidden = message === '';
    status.textContent = message;
    status.classList.toggle('success', success);
}

function setBusy(next: boolean): void {
    busy = next;
    submit.disabled = next;
    submit.classList.toggle('busy', next);
    submitLabel.textContent = next ? COPY[mode].busy : COPY[mode].submit;
}

/** 0–4 score: length first, then character variety. */
function scorePassword(value: string): number {
    if (value.length === 0) return 0;
    if (value.length < MIN_PASSWORD) return 1;
    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((pattern) => pattern.test(value)).length;
    return Math.min(4, 1 + Math.ceil(variety / 1.5) + (value.length >= 16 ? 1 : 0));
}

const STRENGTH_LABELS = ['At least 10 characters', 'Too short', 'Okay', 'Good', 'Strong'];

function updateStrength(): void {
    const score = mode === 'register' ? scorePassword(password.value) : 0;
    strength.dataset.score = String(score);
    strengthLabel.textContent = STRENGTH_LABELS[score] ?? '';
}

function setMode(next: AuthMode): void {
    mode = next;
    const registering = mode === 'register';
    document.body.classList.toggle('register', registering);
    for (const [key, tab] of Object.entries(tabs)) {
        tab.classList.toggle('active', key === mode);
        tab.setAttribute('aria-selected', String(key === mode));
    }
    byId('title').textContent = COPY[mode].title;
    byId('subtitle').textContent = COPY[mode].subtitle;
    emailField.hidden = !registering;
    strength.hidden = !registering;
    email.required = registering;
    username.placeholder = registering ? 'Choose a username' : 'Your username';
    password.placeholder = registering ? `At least ${MIN_PASSWORD} characters` : 'Your password';
    password.autocomplete = registering ? 'new-password' : 'current-password';
    password.minLength = registering ? MIN_PASSWORD : 1;
    setStatus('');
    setBusy(false);
    updateStrength();
    (username.value ? password : username).focus();
}

/** Client-side checks mirror the server's; the server validates everything again. */
function validate(): string | undefined {
    const name = username.value.trim();
    if (mode === 'login') {
        if (!name || !password.value) return 'Enter your username and password.';
        return undefined;
    }
    if (!/^\w{3,24}$/.test(name)) return 'Username must be 3–24 characters using letters, numbers, or underscores.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return 'Enter a valid email address.';
    if (password.value.length < MIN_PASSWORD) return `Use a password with at least ${MIN_PASSWORD} characters.`;
    return undefined;
}

tabs.login.addEventListener('click', () => setMode('login'));
tabs.register.addEventListener('click', () => setMode('register'));

reveal.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    reveal.setAttribute('aria-pressed', String(show));
    reveal.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    password.focus();
});

password.addEventListener('input', updateStrength);
for (const type of ['keydown', 'keyup'] as const) {
    password.addEventListener(type, (event) => (caps.hidden = !event.getModifierState('CapsLock')));
}
password.addEventListener('blur', () => (caps.hidden = true));

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const problem = validate();
    if (problem) return setStatus(problem);

    setStatus('');
    setBusy(true);
    const request: SubmitRequest = {
        mode,
        username: username.value.trim(),
        email: mode === 'register' ? email.value.trim() : '',
        password: password.value,
    };
    try {
        const result = await postNui<SubmitResponse>('submit', request);
        setStatus(result.message, result.ok);
        if (result.ok) {
            storage.set(request.username);
            submitLabel.textContent = 'Entering the city…';
            return; // stays busy while the world loads
        }
    } catch {
        setStatus('Could not reach the server. Please try again.');
    }
    setBusy(false);
});

onNuiMessage<CoreNuiMessage>({
    open: ({ online }) => {
        byId('online').textContent = String(online);
        username.value = storage.get();
        password.value = '';
        password.type = 'password';
        document.body.classList.add('visible');
        setMode('login');
    },
    close: () => document.body.classList.remove('visible'),
    error: ({ message }) => {
        setBusy(false);
        setStatus(message);
    },
});
