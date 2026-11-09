/**
 * One RPC behind the /questions and /tickets menus. The server decides which view you get:
 *   /questions — helpers see the question queue, everyone else gets the "ask" form.
 *   /tickets   — admins see the ticket queue, everyone else gets the "open a ticket" form.
 */
import type { Account, Result, SupportKind, SupportView } from '@shared/common/types.ts';
import { log } from '@shared/common/log.ts';
import { isPositiveInt, isString } from '@shared/common/validate.ts';
import { Core } from '@shared/server/core.ts';
import { onRpc } from '@shared/server/rpc.ts';
import { CommandError, fail } from '../context.ts';
import { questionService } from './questions.ts';
import { ticketService } from './tickets.ts';

const isStaffFor = (account: Account, kind: SupportKind) => (kind === 'question' ? account.helper >= 1 : account.admin >= 1);

async function view(source: number, account: Account, kind: SupportKind): Promise<SupportView> {
    if (isStaffFor(account, kind)) {
        return { view: 'queue', kind, items: kind === 'question' ? questionService.list(source) : await ticketService.list() };
    }
    const pending = kind === 'question' ? questionService.pendingFor(source) : await ticketService.pendingFor(account);
    return { view: 'ask', kind, pending };
}

const requireStaff = (account: Account, kind: SupportKind) => {
    if (!isStaffFor(account, kind)) fail('You do not have permission to do that.');
};
const requireId = (value: unknown): number => (isPositiveInt(value) ? value : fail('Invalid ID.'));
const requireText = (value: unknown): string => (isString(value, 400) ? value : fail('Invalid text.'));

async function handle(source: number, input: unknown): Promise<Result<SupportView>> {
    const account = Core.getAccount(source);
    if (!account) return { ok: false, error: 'Sign in first.' };
    if (typeof input !== 'object' || input === null) return { ok: false, error: 'Invalid request.' };
    const action = input as Record<string, unknown>;
    const kind = action.kind;
    if (kind !== 'question' && kind !== 'ticket') return { ok: false, error: 'Invalid request.' };

    try {
        switch (action.op) {
            case 'open':
                break;
            case 'create':
                await (kind === 'question' ? questionService.create(source, account, requireText(action.text)) : ticketService.create(source, account, requireText(action.text)));
                break;
            case 'accept':
                requireStaff(account, 'question');
                await questionService.accept(source, account, requireId(action.id));
                break;
            case 'close':
                requireStaff(account, 'question');
                await questionService.close(source, account, requireId(action.id));
                break;
            case 'reject':
                requireStaff(account, 'question');
                await questionService.reject(source, account, requireId(action.id), requireText(action.reason));
                break;
            case 'answer':
                requireStaff(account, 'ticket');
                await ticketService.answer(account, requireId(action.id), requireText(action.text));
                break;
            case 'dismiss':
                requireStaff(account, 'ticket');
                await ticketService.dismiss(account, requireId(action.id));
                break;
            default:
                return { ok: false, error: 'Invalid request.' };
        }
        return { ok: true, data: await view(source, account, kind) };
    } catch (error) {
        if (error instanceof CommandError) return { ok: false, error: error.message };
        log.error('Support action failed:', error);
        return { ok: false, error: 'Something went wrong. Please try again.' };
    }
}

onRpc('ket_admin:support', handle, { cooldownMs: 250 });
