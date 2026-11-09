import type { Settings } from '@shared/common/types.ts';
import { isHexColor } from '@shared/common/validate.ts';
import { byId, setAccent } from '@shared/web/dom.ts';
import { onNuiMessage, postNui } from '@shared/web/nui.ts';
import type { SettingsNuiMessage, UpdateResponse } from '../common/nui.ts';

const menu = byId('menu');
const colorInput = byId<HTMLInputElement>('color');
const colorValue = byId<HTMLOutputElement>('color-value');
const colorStatus = byId('color-status');
const presets = [...document.querySelectorAll<HTMLButtonElement>('.presets button')];

const toggles = [
    { key: 'showFps', input: byId<HTMLInputElement>('fps-toggle'), status: byId('fps-status') },
    { key: 'showOwnNameTag', input: byId<HTMLInputElement>('nametag-toggle'), status: byId('nametag-status') },
] as const;

const unitButtons = [...document.querySelectorAll<HTMLButtonElement>('#unit button')];
const unitStatus = byId('unit-status');

const save = (patch: Partial<Settings>) => postNui<UpdateResponse>('update', { patch });

function showUnit(metric: boolean): void {
    for (const button of unitButtons) button.setAttribute('aria-checked', String((button.dataset.metric === 'true') === metric));
}

for (const button of unitButtons) {
    button.addEventListener('click', async () => {
        const metric = button.dataset.metric === 'true';
        if (button.getAttribute('aria-checked') === 'true') return;
        const previous = !metric;
        showUnit(metric);
        unitButtons.forEach((item) => (item.disabled = true));
        unitStatus.textContent = 'Saving...';
        try {
            const result = await save({ metricSpeed: metric });
            if (!result.ok) throw new Error(result.error);
            showUnit(result.settings.metricSpeed);
            unitStatus.textContent = 'Setting saved.';
        } catch (error) {
            showUnit(previous);
            unitStatus.textContent = error instanceof Error ? error.message : 'Could not save setting.';
        } finally {
            unitButtons.forEach((item) => (item.disabled = false));
        }
    });
}

function previewColor(color: string): void {
    if (!isHexColor(color)) return;
    colorInput.value = color;
    colorValue.value = color.toUpperCase();
    setAccent('preview-accent', color);
    for (const button of presets) button.setAttribute('aria-pressed', String(button.dataset.color?.toLowerCase() === color.toLowerCase()));
}

function close(): void {
    menu.classList.remove('open');
    postNui('close').catch((error) => console.error('[ket_settings] close failed', error));
}

for (const button of presets) {
    button.style.setProperty('--swatch', button.dataset.color ?? '');
    button.addEventListener('click', () => previewColor(button.dataset.color ?? ''));
}
colorInput.addEventListener('input', () => previewColor(colorInput.value));
byId('close').addEventListener('click', close);

byId('apply').addEventListener('click', async () => {
    colorStatus.textContent = 'Saving...';
    try {
        const result = await save({ hudColor: colorInput.value.toLowerCase() });
        if (!result.ok) throw new Error(result.error);
        previewColor(result.settings.hudColor);
        colorStatus.textContent = 'Color saved.';
    } catch (error) {
        colorStatus.textContent = error instanceof Error ? error.message : 'Could not save color.';
    }
});

for (const { key, input, status } of toggles) {
    input.addEventListener('change', async () => {
        const requested = input.checked;
        input.disabled = true;
        status.textContent = 'Saving...';
        try {
            const result = await save({ [key]: requested });
            if (!result.ok) throw new Error(result.error);
            input.checked = result.settings[key];
            status.textContent = 'Setting saved.';
        } catch (error) {
            input.checked = !requested;
            status.textContent = error instanceof Error ? error.message : 'Could not save setting.';
        } finally {
            input.disabled = false;
        }
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('open')) close();
});

onNuiMessage<SettingsNuiMessage>({
    open: ({ settings }) => {
        previewColor(settings.hudColor);
        colorStatus.textContent = '';
        for (const { key, input, status } of toggles) {
            input.checked = settings[key];
            input.disabled = false;
            status.textContent = '';
        }
        showUnit(settings.metricSpeed);
        unitButtons.forEach((item) => (item.disabled = false));
        unitStatus.textContent = '';
        menu.classList.add('open');
    },
});
