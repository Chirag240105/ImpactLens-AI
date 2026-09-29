import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import type { Project, ProjectInput } from '@/api/types';
import { toFormValues, toProjectInput } from '@/lib/projectForm';
import { DEFAULT_CATEGORIES, PROJECT_STATUSES, PROJECT_STATUS_LABEL } from '@/lib/constants';
import { projectSchema, type ProjectFormValues } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';

function CategoryPicker({ value, onChange, error }: { value: string[]; onChange: (v: string[]) => void; error?: string }) {
  const [custom, setCustom] = useState('');
  const options = [...new Set([...DEFAULT_CATEGORIES, ...value])];
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  const add = () => {
    const c = custom.trim();
    if (c && !value.includes(c)) onChange([...value, c]);
    setCustom('');
  };
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-meta font-semibold">Expected evidence categories</legend>
      <p className="-mt-1 text-meta text-ink-3">Coverage is measured against these. Missing ones appear as evidence gaps.</p>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const on = value.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c)}
              className={cn(
                'touch-target inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-meta font-medium transition-colors',
                on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink-2 hover:border-line-hover',
              )}
            >
              {c}
              {on && <X className="size-3.5" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a custom category"
          aria-label="Custom evidence category"
          className="max-w-xs"
        />
        <Button onClick={add} leftIcon={<Plus />} disabled={!custom.trim()}>
          Add
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-meta font-medium text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function ProjectForm({
  initial,
  onSubmit,
  isSubmitting,
  submitLabel,
  secondary,
  id,
}: {
  initial?: Project;
  onSubmit: (input: ProjectInput) => void;
  isSubmitting?: boolean;
  submitLabel: string;
  secondary?: ReactNode;
  id?: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema), defaultValues: toFormValues(initial) });

  return (
    <form id={id} noValidate onSubmit={handleSubmit((v) => onSubmit(toProjectInput(v)))} className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Project name" required error={errors.name?.message} className="sm:col-span-2">
          <Input placeholder="Yamuna Urban Restoration Initiative" {...register('name')} />
        </Field>
        <Field label="Organization" required error={errors.organization?.message}>
          <Input placeholder="Green Futures NGO" {...register('organization')} />
        </Field>
        <Field label="Category" hint="e.g. Urban restoration, Water access" error={errors.category?.message}>
          <Input {...register('category')} />
        </Field>
        <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea rows={3} placeholder="What the project does and what evidence it collects." {...register('description')} />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Select {...register('status')}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primary location" error={errors.locationName?.message}>
          <Input placeholder="Delhi" {...register('locationName')} />
        </Field>
        <Field label="Latitude" hint="Optional" error={errors.lat?.message}>
          <Input inputMode="decimal" placeholder="28.6139" {...register('lat')} />
        </Field>
        <Field label="Longitude" hint="Optional" error={errors.lng?.message}>
          <Input inputMode="decimal" placeholder="77.2090" {...register('lng')} />
        </Field>
        <Field label="Start date" error={errors.startDate?.message}>
          <Input type="date" {...register('startDate')} />
        </Field>
        <Field label="End date" error={errors.endDate?.message}>
          <Input type="date" {...register('endDate')} />
        </Field>
        <Field label="Goals" hint="One goal per line." error={errors.goals?.message} className="sm:col-span-2">
          <Textarea rows={3} placeholder={'Restore riverbank vegetation\nDocument community participation'} {...register('goals')} />
        </Field>
      </div>
      <Controller
        control={control}
        name="expectedEvidenceCategories"
        render={({ field, fieldState }) => (
          <CategoryPicker value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {secondary}
        <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={Boolean(initial) && !isDirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
