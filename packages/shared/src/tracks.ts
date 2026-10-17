import { z } from 'zod';

/** Track as sent to the app. `id` is a stable key: "lib:<record id>" or "jam:<jamendo id>". */
export const trackDto = z.object({
  id: z.string(), title: z.string(), artist: z.string(), album: z.string(), duration: z.number(), cat: z.string(), hue: z.number(),
  license: z.string(), licenseUrl: z.string(), shareUrl: z.string(), rights: z.string(), audio: z.string(), image: z.string(),
  source: z.enum(['library', 'jamendo']), featured: z.boolean(),
});
export type TrackDto = z.infer<typeof trackDto>;
