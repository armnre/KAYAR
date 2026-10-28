import { Compass } from 'lucide-react';
import { KButton, StateView } from '../components/kit';

export function NotFound() {
  return <div className="grid min-h-svh place-items-center depth-bg"><StateView icon={Compass} title="این صفحه پیدا نشد (۴۰۴)" text="شاید آدرس اشتباه است." action={<KButton to="/">صفحه‌ی اصلی</KButton>} /></div>;
}
