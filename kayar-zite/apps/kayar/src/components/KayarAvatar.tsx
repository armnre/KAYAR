import { cn } from '@project/components/lib/utils';

export const DEFAULT_AVATAR = '/media/img_5yQQMd9HFJmzE6lD.jpg';

/** Generated KAYAR athlete avatars members can choose from. Keys are stored on the member. */
export const AVATARS: { key: string; url: string; label: string }[] = [
  { key: 'a1', label: 'هودی', url: '/media/img_NPTC6LKfI-efy95o.jpg' },
  { key: 'a2', label: 'ورزشکار', url: '/media/img_IvSGU4Y9EyxWj_EC.jpg' },
  { key: 'a3', label: 'بوکسور', url: '/media/img_PmlJOYx89IXH3hXs.jpg' },
  { key: 'a4', label: 'دونده', url: '/media/img_Ijs-MU2y5eutRyai.jpg' },
  { key: 'a5', label: 'اسپرینتر', url: '/media/img__M-eXI4LZhYpz6c0.jpg' },
  { key: 'a6', label: 'فیتنس', url: '/media/img_YPeP9Lmkbm2z1LxT.jpg' },
  { key: 'a7', label: 'بدنساز', url: '/media/img_TQzghF2qqQqa0mNm.jpg' },
  { key: 'a8', label: 'یوگا', url: '/media/img_OAr7eEgRO29rWKB4.jpg' },
  { key: 'a9', label: 'دوچرخه‌سوار', url: '/media/img_efKYh_dUxyVXfn3L.jpg' },
  { key: 'a10', label: 'بوکس بانوان', url: '/media/img_WZD7MZhtsVRgaQa7.jpg' },
  { key: 'a11', label: 'کاپیتان', url: '/media/img_pkRGKNfX1WL7Ndo_.jpg' },
  { key: 'a12', label: 'ببر', url: '/media/img_Qeve7KppK8G-DbGe.jpg' },
  { key: 'a13', label: 'گرگ', url: '/media/img_zvibJPwz2prY0kek.jpg' },
  { key: 'a14', label: 'ربات', url: '/media/img_cTJdO1njoiSADeI2.jpg' },
  { key: 'a15', label: 'شناگر', url: '/media/img_6WagbIWk1YQqrCa_.jpg' },
  { key: 'a16', label: 'فوتبالیست', url: '/media/img_YMpBHNGhgisY4h4n.jpg' },
];
export const avatarUrl = (key?: string | null) => AVATARS.find((a) => a.key === key)?.url ?? DEFAULT_AVATAR;

/** KAYAR avatar: the member's chosen generated athlete (or the shared default) inside the neon ring. */
export function KayarAvatar({ avatar, name, size = 88, className }: { avatar?: string | null; name?: string | null; size?: number; className?: string }) {
  const small = size < 48;
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      {!small && <div className="absolute -inset-1.5 rounded-full bg-[conic-gradient(hsl(var(--primary)),hsl(var(--violet)),hsl(var(--cyan)),hsl(var(--primary)))] opacity-35 blur-lg" />}
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,hsl(var(--primary)),hsl(var(--violet)),hsl(var(--cyan)),hsl(var(--primary)))]" />
      <div className={cn('absolute overflow-hidden rounded-full bg-background', small ? 'inset-[2px]' : 'inset-[3px]')}>
        <img src={avatarUrl(avatar)} alt={name ?? ''} className="h-full w-full scale-110 object-cover" />
      </div>
    </div>
  );
}
