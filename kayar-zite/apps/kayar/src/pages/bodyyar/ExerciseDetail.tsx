import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, ListOrdered, Repeat } from 'lucide-react';
import { listExercises } from 'zitejs/api';
import { Card, EmptyState, ErrorState, LoadingBlocks, PageHeader } from '../../components/bkit';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, categoryImage } from '../../lib/assets';
import { useLoad } from '../../lib/useLoad';
import { ExerciseMotion } from '../../components/ExerciseMotion';

export default function ExerciseDetail() {
  const { slug } = useParams();
  const { data, error, loading, reload } = useLoad(() => listExercises({}));
  if (loading) return <LoadingBlocks />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const e = data?.exercises.find((x) => x.slug === slug);
  if (!e) return <EmptyState icon={<AlertTriangle />} title="حرکت پیدا نشد" text="" action={<Link to="/app/bodyyar/exercises" className="text-primary">کتابخانه حرکات</Link>} />;
  const img = categoryImage(e.category);
  const alts = e.alternatives.map((s) => data!.exercises.find((x) => x.slug === s)).filter(Boolean);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={e.name} subtitle={e.englishName} back="/app/bodyyar/exercises" />
      {e.frames.length ? <ExerciseMotion frames={e.frames} alt={e.name} className="aspect-[4/3] w-full rounded-[28px] border border-border" />
        : img && <><img src={img} alt={`تصویر دسته ${CATEGORY_LABELS[e.category]}`} className="aspect-[16/9] w-full rounded-[28px] object-cover" />
      <p className="text-xs text-muted-foreground">تصویر نمایانگر دسته «{CATEGORY_LABELS[e.category]}» است.</p></>}
      <div className="flex flex-wrap gap-2 text-xs">
        {[CATEGORY_LABELS[e.category], DIFFICULTY_LABELS[e.difficulty], e.equipment, e.location === 'both' ? 'خانه و باشگاه' : e.location === 'gym' ? 'باشگاه' : 'خانه'].map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1">{t}</span>)}
      </div>
      <Card><div className="text-xs text-muted-foreground">عضلات هدف</div><div className="mt-1 font-semibold">{e.muscles}</div></Card>
      <Card><div className="mb-2 flex items-center gap-2 font-bold"><ListOrdered className="h-5 w-5 text-primary" />روش اجرا</div><ol className="list-decimal space-y-1 ps-5 text-sm">{e.instructions.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ol></Card>
      {e.mistakes && <Card><div className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="h-5 w-5 text-destructive" />اشتباهات رایج</div><p className="text-sm text-muted-foreground">{e.mistakes}</p></Card>}
      {e.safety && <Card className="border-accent/40"><div className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-accent" />ایمنی</div><p className="text-sm text-muted-foreground">{e.safety}</p></Card>}
      {alts.length > 0 && (
        <Card><div className="mb-2 flex items-center gap-2 font-bold"><Repeat className="h-5 w-5 text-primary" />حرکات جایگزین</div>
          <div className="flex flex-wrap gap-2">{alts.map((a) => <Link key={a!.slug} to={`/app/bodyyar/exercises/${a!.slug}`} className="rounded-2xl bg-secondary px-3 py-2 text-sm hover:text-primary">{a!.name}</Link>)}</div>
        </Card>
      )}
    </div>
  );
}
