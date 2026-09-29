import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileVideo, ImagePlus, LocateFixed, Trash2, UploadCloud } from 'lucide-react';
import { useUploadMedia } from '@/api/mutations';
import type { EvidenceType } from '@/api/types';
import { ACCEPTED_MEDIA, EVIDENCE_TYPES, EVIDENCE_TYPE_LABEL, MAX_UPLOAD_FILES, MAX_UPLOAD_MB } from '@/lib/constants';
import { uploadSchema, type UploadFormValues } from '@/lib/schemas';
import { cn, formatBytes } from '@/lib/utils';
import { Dialog } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';
import { InlineAlert } from '@/components/ui/Feedback';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';

const ACCEPT = Object.keys(ACCEPTED_MEDIA).join(',');
const accepted = new Set(Object.keys(ACCEPTED_MEDIA));

interface Picked {
  file: File;
  url: string;
  key: string;
}

export function UploadDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const upload = useUploadMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropId = useId();
  const [files, setFiles] = useState<Picked[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  // Device location is only requested when the user clicks "Use my current location".
  const deviceLoc = useDeviceLocation({ auto: false });
  const [wantsLocation, setWantsLocation] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { evidenceType: 'FIELD_EVIDENCE', captureDate: '', locationName: '', lat: '', lng: '' },
  });

  // Object URLs are revoked when a file is removed, the dialog closes, or it unmounts.
  const urls = useRef(new Set<string>());
  const revokeAll = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current.clear();
  };
  useEffect(() => revokeAll, []);
  useEffect(() => {
    if (!open) {
      revokeAll();
      setWantsLocation(false);
      setFiles([]);
      setRejected([]);
      setProgress(0);
      reset();
    }
  }, [open, reset]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const bad: string[] = [];
    const next: Picked[] = [];
    for (const file of Array.from(list)) {
      if (!accepted.has(file.type)) bad.push(`${file.name}: unsupported type`);
      else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) bad.push(`${file.name}: larger than ${MAX_UPLOAD_MB} MB`);
      else {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        next.push({ file, url, key: `${file.name}-${file.size}-${file.lastModified}` });
      }
    }
    setFiles((prev) => {
      const merged = [...prev, ...next.filter((n) => !prev.some((p) => p.key === n.key))];
      if (merged.length > MAX_UPLOAD_FILES) bad.push(`Only ${MAX_UPLOAD_FILES} files per upload; extra files were skipped`);
      return merged.slice(0, MAX_UPLOAD_FILES);
    });
    setRejected(bad);
  }, []);

  const totalBytes = useMemo(() => files.reduce((n, f) => n + f.file.size, 0), [files]);

  const fillCurrentLocation = () => {
    setWantsLocation(true);
    deviceLoc.request();
  };
  // Fill coordinates as soon as they arrive, then the place name once reverse geocoding returns.
  useEffect(() => {
    if (!wantsLocation || deviceLoc.status !== 'ready' || deviceLoc.lat === undefined || deviceLoc.lng === undefined) return;
    setValue('lat', deviceLoc.lat.toFixed(6), { shouldValidate: true });
    setValue('lng', deviceLoc.lng.toFixed(6), { shouldValidate: true });
    if (deviceLoc.place) setValue('locationName', deviceLoc.place, { shouldValidate: true });
  }, [wantsLocation, deviceLoc.status, deviceLoc.lat, deviceLoc.lng, deviceLoc.place, setValue]);

  const onSubmit = handleSubmit((v) => {
    if (!files.length) return;
    upload.mutate(
      {
        input: {
          projectId,
          files: files.map((f) => f.file),
          evidenceType: v.evidenceType as EvidenceType,
          captureDate: v.captureDate || undefined,
          location: v.lat !== '' ? { lat: Number(v.lat), lng: Number(v.lng), name: v.locationName || undefined } : undefined,
        },
        onProgress: setProgress,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !upload.isPending && onOpenChange(o)}
      title="Upload field media"
      description="Photos and videos are stored as evidence, then analyzed by AI in the background."
      className="max-w-2xl"
      footer={
        <>
          <span className="mr-auto text-meta text-ink-3" aria-live="polite">
            {upload.isPending ? `Uploading… ${progress}%` : files.length ? `${files.length} file${files.length === 1 ? '' : 's'} · ${formatBytes(totalBytes)}` : 'No files selected'}
          </span>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button variant="primary" leftIcon={<UploadCloud />} onClick={onSubmit} isLoading={upload.isPending} disabled={!files.length}>
            Upload {files.length ? files.length : ''}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
            dragging ? 'border-accent bg-accent-soft' : 'border-line-hover bg-surface-alt',
          )}
        >
          <ImagePlus className="size-7 text-accent" aria-hidden />
          <p className="mt-2 text-sm font-semibold">Drag photos and videos here</p>
          <p className="mt-1 text-meta text-ink-3">
            JPG, PNG, WebP, GIF, MP4, MOV, WebM · up to {MAX_UPLOAD_MB} MB each · {MAX_UPLOAD_FILES} files max
          </p>
          <Button className="mt-4" onClick={() => inputRef.current?.click()} aria-describedby={dropId}>
            Choose files
          </Button>
          <span id={dropId} className="sr-only">
            Opens a file picker. You can also drag and drop files onto this area.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {rejected.length > 0 && (
          <InlineAlert tone="warning" title="Some files were skipped">
            <ul className="list-disc pl-4">
              {rejected.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </InlineAlert>
        )}

        {files.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Selected files">
            {files.map((f) => (
              <li key={f.key} className="group relative overflow-hidden rounded-md border border-line">
                {f.file.type.startsWith('image/') ? (
                  <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center bg-surface-alt text-ink-3">
                    <FileVideo className="size-6" aria-hidden />
                  </div>
                )}
                <div className="truncate px-1.5 py-1 text-label text-ink-3" title={f.file.name}>
                  {f.file.name}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${f.file.name}`}
                  onClick={() => {
                    URL.revokeObjectURL(f.url);
                    urls.current.delete(f.url);
                    setFiles((prev) => prev.filter((p) => p.key !== f.key));
                  }}
                  disabled={upload.isPending}
                  className="absolute top-1 right-1 grid size-7 place-items-center rounded-md bg-surface/90 text-error shadow-xs"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {upload.isPending && (
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Evidence type" hint="Mark Before/After captures to enable comparisons." error={errors.evidenceType?.message}>
            <Select {...register('evidenceType')}>
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVIDENCE_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Capture date" hint="Leave empty to read it from photo metadata." error={errors.captureDate?.message}>
            <Input type="date" {...register('captureDate')} />
          </Field>
        </div>
        <fieldset className="grid gap-3 rounded-lg border border-line p-4">
          <legend className="px-1 text-meta font-semibold">Location (optional)</legend>
          <p className="-mt-1 text-meta text-ink-3">
            Photos with GPS metadata are tagged <b>GPS verified</b> automatically. Coordinates entered here are stored as <b>User provided</b> and apply to every file in this upload.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Place name" error={errors.locationName?.message}>
              <Input placeholder="Noida" {...register('locationName')} />
            </Field>
            <Field label="Latitude" error={errors.lat?.message}>
              <Input inputMode="decimal" placeholder="28.5355" {...register('lat')} />
            </Field>
            <Field label="Longitude" error={errors.lng?.message}>
              <Input inputMode="decimal" placeholder="77.3910" {...register('lng')} />
            </Field>
          </div>
          <div>
            <Button size="sm" variant="ghost" leftIcon={<LocateFixed />} onClick={fillCurrentLocation} isLoading={deviceLoc.status === 'locating'}>
              {wantsLocation && deviceLoc.status === 'ready' ? 'Update my location' : 'Use my current location'}
            </Button>
            <span className="ml-2 text-meta text-ink-3" aria-live="polite">
              {wantsLocation && deviceLoc.status === 'denied' && 'Location access is blocked in your browser settings.'}
              {wantsLocation && deviceLoc.status === 'error' && 'Couldn’t get your location. Try again or enter it manually.'}
              {wantsLocation && deviceLoc.status === 'unavailable' && 'Location isn’t available on this device.'}
              {wantsLocation && deviceLoc.status === 'ready' && deviceLoc.accuracy !== undefined && `Accurate to about ${Math.round(deviceLoc.accuracy)} m`}
            </span>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
