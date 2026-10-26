// Phase 3 features stay hidden behind these flags.

export const features = {
  coaches: false,
  campaigns: false,
  game: false,
  chat: false,
};

export const IMG = {
  heroMale: '/media/img_6hSskSlC6BwCKZ21.jpg',
  heroFemale: '/media/img_n1JeLq9Rzgrcbrl3.jpg',
  morshed: '/media/img_oPmkOrwF9MOWO-W_.jpg',
  run: '/media/img_0dCMOm1WQh9f_X8K.jpg',
};

const faDigits = '۰۱۲۳۴۵۶۷۸۹';
export const fa = (v: string | number) => String(v).replace(/\d/g, (d) => faDigits[Number(d)]);
export const faNum = (n: number) => fa(n.toLocaleString('en-US').replace(/,/g, '٬'));
export const toman = (n: number) => `${faNum(n)} تومان`;
export const faDate = (d: Date | string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
