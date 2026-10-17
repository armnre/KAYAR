import { z } from 'zod';
import { createEndpoint, ZiteError } from '../server/backend.js';
import { zite } from '../server/db.js';
import { requireStaff } from '../server/rbac.js';
import { getSettings, settingsSchema } from '../server/settings.js';
import { audit } from '../server/audit.js';
import { tokenField } from '../server/util.js';

const SECRETS = [
  'ADMIN_BOOTSTRAP_USERNAME',
  'ADMIN_BOOTSTRAP_PASSWORD',
  'AUTH_PEPPER',
  'JAMENDO_CLIENT_ID',
] as const;

export default createEndpoint({
  description: 'Reads or saves site settings (superadmin only); secrets are reported as set/unset only',
  inputSchema: z.object({ token: tokenField, save: z.record(z.unknown()).optional() }),
  outputSchema: z.object({ settings: settingsSchema, secrets: z.array(z.object({ key: z.string(), set: z.boolean() })) }),
  execute: async ({ input, ctx }) => {
    const { member } = await requireStaff(ctx, 'settings.manage');
    const { _id, ...current } = await getSettings();
    let settings = current;
    if (input.save) {
      const r = settingsSchema.safeParse(input.save);
      if (!r.success) throw new ZiteError({ code: 'BAD_REQUEST', message: 'INVALID', userFacingMessage: r.error.issues[0]?.message ?? 'تنظیمات نامعتبر است.' });
      settings = r.data;
      if (_id) await zite.siteSettings.update({ id: _id, record: { value: JSON.stringify(settings) } });
      else await zite.siteSettings.create({ record: { key: 'site', value: JSON.stringify(settings) } });
      const changed = Object.keys(settings).filter((k) => JSON.stringify(settings[k as keyof typeof settings]) !== JSON.stringify(current[k as keyof typeof current]));
      const diff = Object.fromEntries(changed.map((k) => [k, { from: current[k as keyof typeof current], to: settings[k as keyof typeof settings] }]));
      await audit(member.id, 'settings.update', 'settings', 'site', { changed, diff });
    }
    return { settings, secrets: SECRETS.map((key) => ({ key, set: !!process.env[key] })) };
  },
});
