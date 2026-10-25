import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { setAvatar } from 'zitejs/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@project/components/ui/sheet';
import { Button } from '@project/components/ui/button';
import { AVATARS, DEFAULT_AVATAR } from '../KayarAvatar';
import { errMsg } from '../../lib/session';

export function AvatarPicker({ open, onOpenChange, token, current, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; token: string; current?: string | null; onSaved: () => Promise<void> }) {
  const [sel, setSel] = useState<string>(current || '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await setAvatar({ token, avatar: sel }); await onSaved(); toast.success('آواتارت عوض شد'); onOpenChange(false); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  const tile = (key: string, url: string, label: string) => (
    <button key={key || 'def'} onClick={() => setSel(key)} className={`press relative aspect-square overflow-hidden rounded-full ring-2 transition ${sel === key ? 'ring-primary shadow-[0_0_18px_hsl(var(--primary)/.6)]' : 'ring-white/10'}`} aria-label={label}>
      <img src={url} alt={label} className="h-full w-full scale-110 object-cover" />
      {sel === key && <span className="absolute inset-0 grid place-items-center bg-black/35"><Check className="h-6 w-6 text-primary" /></span>}
    </button>
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[28px]" dir="rtl">
        <SheetHeader><SheetTitle>انتخاب آواتار</SheetTitle></SheetHeader>
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {tile('', DEFAULT_AVATAR, 'پیش‌فرض')}
          {AVATARS.map((a) => tile(a.key, a.url, a.label))}
        </div>
        <Button className="mt-5 w-full" disabled={saving || sel === (current || '')} onClick={save}>
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}ذخیره
        </Button>
      </SheetContent>
    </Sheet>
  );
}
