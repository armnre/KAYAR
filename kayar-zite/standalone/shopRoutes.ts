// GET /go/:itemId — counts a click (daily aggregate, no personal data) and 302-redirects to the
// destination stored in the database. The destination is NEVER read from the request (no open redirect).
import { Router } from 'express';
import { pool } from './db';
import { hit, tooMany } from './ratelimit';
import { destination, seedShop } from '../apps/kayar/src/server/shop';
import { isLive } from '../apps/kayar/src/server/shop';
type ShopItemsRecordType = Parameters<typeof destination>[0];
type ShopPartnersRecordType = NonNullable<Parameters<typeof destination>[1]>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function initShop() {
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ShopClicks_item_day" ON "ShopClicks" ("itemId", "day")`);
  await seedShop();
}

export function shopRouter() {
  const r = Router();
  r.get('/go/:id', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const wait = hit(`go:${req.ip}`, Number(process.env.RL_GO_PER_MIN || 60), 60_000);
    if (wait) return tooMany(res, wait);
    const id = String(req.params.id);
    if (!UUID.test(id)) return res.redirect(302, '/shop');
    const { rows } = await pool.query(`SELECT * FROM "ShopItems" WHERE id = $1 LIMIT 1`, [id]);
    const item = rows[0] as ShopItemsRecordType | undefined;
    if (!item || !isLive(item)) return res.redirect(302, '/shop');
    const p = item.partnerId && UUID.test(item.partnerId) ? (await pool.query(`SELECT * FROM "ShopPartners" WHERE id = $1 LIMIT 1`, [item.partnerId])).rows[0] as ShopPartnersRecordType | undefined : undefined;
    if (p && p.active === false) return res.redirect(302, '/shop');
    const to = destination(item, p);
    if (!to) return res.redirect(302, '/shop');
    const day = new Date(Date.now() + 3.5 * 3600_000).toISOString().slice(0, 10);
    pool.query(`INSERT INTO "ShopClicks" ("itemId", "day", "n") VALUES ($1, $2, 1) ON CONFLICT ("itemId", "day") DO UPDATE SET "n" = "ShopClicks"."n" + 1, updated_at = now()`, [id, day]).catch(() => {});
    res.setHeader('Referrer-Policy', 'origin');
    res.redirect(302, to);
  });
  return r;
}
