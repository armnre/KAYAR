import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getDashboard, saveProfile } from 'zitejs/api';
import { tok } from '../../lib/session';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Card, PageHeader, errMsg, faNum } from '../../components/bkit';
import { cn } from '@project/components/lib/utils';
import { IconBadge, ACTIVITY_ICON, OPTION_ICON } from '../../components/icons/kayar';

type F = { goal: string; level: string; daysPerWeek: number; place: string; equipment: string[]; sessionMinutes: number; diet: string; limitations: string; age: string; heightCm: string; weightKg: string; sex: '' | 'male' | 'female'; activityLevel: string; targetWeightKg: string; sleepHours: number; waistCm: string; allergies: string };
const EMPTY: F = { goal: '', level: '', daysPerWeek: 3, place: '', equipment: [], sessionMinutes: 45, diet: '', limitations: '', age: '', heightCm: '', weightKg: '', sex: '', activityLevel: '', targetWeightKg: '', sleepHours: 7, waistCm: '', allergies: '' };

const GOALS = ['کاهش وزن', 'عضله‌سازی', 'افزایش قدرت', 'تناسب و سلامت عمومی', 'آمادگی دویدن'];
const LEVELS = ['مبتدی', 'متوسط', 'پیشرفته'];
const PLACES = ['خانه', 'باشگاه', 'فضای باز'];
const EQUIP = ['بدون وسیله', 'دمبل', 'هالتر', 'کتل‌بل', 'میله بارفیکس', 'کش مقاومتی', 'نیمکت', 'دستگاه‌های باشگاه'];
const DIETS = ['معمولی', 'گیاهی', 'وگان', 'بدون گلوتن', 'پرپروتئین'];

const numOpt = (min: number, max: number) => z.string().refine((v) => v === '' || (Number(v) >= min && Number(v) <= max), `بین ${min} و ${max}`);
const bodySchema = z.object({ age: numOpt(13, 100), heightCm: numOpt(100, 250), weightKg: numOpt(25, 300) });
const lifeSchema = z.object({ targetWeightKg: numOpt(25, 300), waistCm: numOpt(40, 200) });
const ACTIVITY = [['sedentary', ACTIVITY_ICON.sedentary, 'کم‌تحرک', 'پشت میز، کمتر از ۳ هزار قدم'], ['light', ACTIVITY_ICON.light, 'سبک', 'کمی پیاده‌روی روزانه'], ['moderate', ACTIVITY_ICON.moderate, 'متوسط', 'کار سرپا یا ۸ هزار قدم'], ['active', ACTIVITY_ICON.active, 'فعال', 'کار بدنی یا ۱۲ هزار قدم+'], ['athlete', ACTIVITY_ICON.athlete, 'ورزشکار', 'تمرین سنگین روزانه']] as const;


function Chips({ options, value, onChange, multi }: { options: string[]; value: string | string[]; onChange: (v: string) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = multi ? (value as string[]).includes(o) : value === o;
        return <button type="button" key={o} onClick={() => onChange(o)} aria-pressed={on} className={cn('press flex min-h-[48px] items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition', on ? 'border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_hsl(var(--primary))]' : 'border-white/10 bg-white/[.04] hover:border-primary/50')}>{(() => { const I = OPTION_ICON[o]; return I ? <I size={18} className={on ? '' : 'text-primary'} /> : null; })()}{o}</button>;
      })}
    </div>
  );
}

export default function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<F>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof F>(k: K, v: F[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    getDashboard({ token: tok(), }).then((d) => {
      const p = d.profile;
      if (p) setF({ goal: p.goal, level: p.level, daysPerWeek: p.daysPerWeek, place: p.place, equipment: p.equipment ? p.equipment.split('، ') : [], sessionMinutes: p.sessionMinutes, diet: p.diet, limitations: p.limitations, age: p.age ? String(p.age) : '', heightCm: p.heightCm ? String(p.heightCm) : '', weightKg: p.weightKg ? String(p.weightKg) : '', sex: (p.sex === 'male' || p.sex === 'female') ? p.sex : '', activityLevel: p.activityLevel ?? '', targetWeightKg: p.targetWeightKg ? String(p.targetWeightKg) : '', sleepHours: p.sleepHours ?? 7, waistCm: p.waistCm ? String(p.waistCm) : '', allergies: p.allergies ?? '' });
    }).catch(() => undefined);
  }, []);

  const body = bodySchema.safeParse(f);
  const bodyErr = body.success ? {} : Object.fromEntries(body.error.issues.map((i) => [i.path[0], i.message]));
  const life = lifeSchema.safeParse(f);
  const lifeErr = life.success ? {} : Object.fromEntries(life.error.issues.map((i) => [i.path[0], i.message]));
  const steps = [
    { title: 'هدف اصلی‌ات چیست؟', valid: !!f.goal, el: <Chips options={GOALS} value={f.goal} onChange={(v) => set('goal', v)} /> },
    { title: 'سطح و زمان تمرین', valid: !!f.level, el: (
      <div className="space-y-6">
        <Chips options={LEVELS} value={f.level} onChange={(v) => set('level', v)} />
        <div><Label>روز در هفته: <span className="latin text-primary">{faNum(f.daysPerWeek)}</span></Label><input type="range" min={1} max={7} value={f.daysPerWeek} onChange={(e) => set('daysPerWeek', Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" /></div>
        <div><Label>مدت هر جلسه: <span className="latin text-primary">{faNum(f.sessionMinutes)}</span> دقیقه</Label><input type="range" min={15} max={120} step={5} value={f.sessionMinutes} onChange={(e) => set('sessionMinutes', Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" /></div>
      </div>) },
    { title: 'کجا و با چه امکاناتی؟', valid: !!f.place && f.equipment.length > 0, el: (
      <div className="space-y-5">
        <Chips options={PLACES} value={f.place} onChange={(v) => set('place', v)} />
        <div><Label className="mb-2 block">تجهیزات در دسترس</Label><Chips multi options={EQUIP} value={f.equipment} onChange={(v) => set('equipment', f.equipment.includes(v) ? f.equipment.filter((x) => x !== v) : [...f.equipment, v])} /></div>
      </div>) },
    { title: 'تغذیه و محدودیت‌ها', valid: true, el: (
      <div className="space-y-5">
        <div><Label className="mb-2 block">ترجیح غذایی (اختیاری)</Label><Chips options={DIETS} value={f.diet} onChange={(v) => set('diet', f.diet === v ? '' : v)} /></div>
        <div><Label htmlFor="lim">آسیب یا محدودیت (اختیاری)</Label><Textarea id="lim" maxLength={600} value={f.limitations} onChange={(e) => set('limitations', e.target.value)} placeholder="مثلاً درد زانو هنگام اسکات" className="mt-2 rounded-2xl" /><p className="mt-1 text-xs text-muted-foreground">برای بیماری یا آسیب جدی حتماً با پزشک مشورت کن.</p></div>
      </div>) },
    { title: 'مشخصات بدنی (برای محاسبه دقیق کالری)', valid: body.success, el: (
      <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">{([['male', 'آقا'], ['female', 'خانم']] as const).map(([v, l]) => (
        <button key={v} type="button" onClick={() => set('sex', f.sex === v ? '' : v)} className={`h-12 rounded-2xl border text-sm font-bold transition ${f.sex === v ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'}`}>{l}</button>))}</div>
      <div className="grid grid-cols-3 gap-3">
        {([['age', 'سن'], ['heightCm', 'قد (cm)'], ['weightKg', 'وزن (kg)']] as const).map(([k, l]) => (
          <div key={k}><Label htmlFor={k}>{l}</Label><Input id={k} inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value.replace(/[^\d.]/g, ''))} className="latin mt-2 rounded-2xl" aria-invalid={!!bodyErr[k]} />{bodyErr[k] && <p className="mt-1 text-xs text-destructive">{bodyErr[k]}</p>}</div>
        ))}
      </div></div>) },
    { title: 'سبک زندگی و هدف دقیق', valid: life.success && !!f.activityLevel, el: (
      <div className="space-y-5">
        <div className="grid gap-2">{ACTIVITY.map(([v, e, l, d]) => (
          <button key={v} type="button" onClick={() => set('activityLevel', v)} className={cn('press flex items-center gap-3 rounded-2xl border p-3 text-start transition', f.activityLevel === v ? 'border-primary bg-primary/15' : 'border-white/10 bg-white/[.03]')}>
            <IconBadge icon={e} tone={f.activityLevel === v ? 'primary' : 'muted'} size="sm" active={f.activityLevel === v} /><span className="flex-1"><b className="block text-sm">{l}</b><span className="text-xs text-muted-foreground">{d}</span></span>
            <span className={cn('h-5 w-5 rounded-full border-2', f.activityLevel === v ? 'border-primary bg-primary' : 'border-white/20')} />
          </button>))}</div>
        <div><Label>خواب شبانه: <span className="text-primary">{faNum(f.sleepHours)}</span> ساعت</Label><input type="range" min={3} max={12} step={0.5} value={f.sleepHours} onChange={(e) => set('sleepHours', Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" /></div>
        <div className="grid grid-cols-2 gap-3">
          {([['targetWeightKg', 'وزن هدف (kg)'], ['waistCm', 'دور کمر (cm)']] as const).map(([k, l]) => (
            <div key={k}><Label htmlFor={k}>{l} <span className="text-xs text-muted-foreground">(اختیاری)</span></Label><Input id={k} inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value.replace(/[^\d.]/g, ''))} className="latin mt-2 rounded-2xl" aria-invalid={!!lifeErr[k]} />{lifeErr[k] && <p className="mt-1 text-xs text-destructive">{lifeErr[k]}</p>}</div>
          ))}
        </div>
        <div><Label htmlFor="alg">آلرژی یا حساسیت غذایی (اختیاری)</Label><Input id="alg" maxLength={300} value={f.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="مثلاً لاکتوز، بادام‌زمینی" className="mt-2 rounded-2xl" /><p className="mt-1 text-xs text-muted-foreground">بدن‌یار این مواد رو هرگز در برنامه غذایی‌ات نمی‌ذاره.</p></div>
      </div>) },
  ];
  const cur = steps[step];

  const submit = async () => {
    setSaving(true);
    try {
      await saveProfile({ token: tok(),  goal: f.goal, level: f.level, daysPerWeek: f.daysPerWeek, place: f.place, equipment: f.equipment.join('، '), sessionMinutes: f.sessionMinutes, diet: f.diet, limitations: f.limitations.trim(), age: f.age ? Math.round(Number(f.age)) : null, heightCm: f.heightCm ? Number(f.heightCm) : null, weightKg: f.weightKg ? Number(f.weightKg) : null, sex: f.sex || null, activityLevel: f.activityLevel || null, targetWeightKg: f.targetWeightKg ? Number(f.targetWeightKg) : null, sleepHours: f.sleepHours, waistCm: f.waistCm ? Number(f.waistCm) : null, allergies: f.allergies.trim() || null });
      toast.success('پروفایل ذخیره شد');
      nav('/app/bodyyar/plan');
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="پروفایل بدن‌یار" subtitle={`قدم ${faNum(step + 1)} از ${faNum(steps.length)}`} back="/app/bodyyar" />
      <div className="mb-6 flex gap-1.5">{steps.map((_, i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-500', i <= step ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/.7)]' : 'bg-white/10')} />)}</div>
      <Card>
        <h2 className="mb-5 text-lg font-bold">{cur.title}</h2>
        {cur.el}
      </Card>
      <div className="mt-6 flex gap-3">
        {step > 0 && <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setStep(step - 1)}>قبلی</Button>}
        {step < steps.length - 1
          ? <Button className="flex-1 rounded-2xl" disabled={!cur.valid} onClick={() => setStep(step + 1)}>بعدی</Button>
          : <Button className="flex-1 rounded-2xl" disabled={!cur.valid || saving || !f.goal || !f.level || !f.place} onClick={submit}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ذخیره</Button>}
      </div>
    </div>
  );
}
