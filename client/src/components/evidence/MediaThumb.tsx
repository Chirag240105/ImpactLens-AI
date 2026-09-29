import { useState } from 'react';
import { ImageOff, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lazy image with an informative fallback (never a flat grey block): mock-mode Cloudinary
 * placeholders or expired URLs show the file name instead.
 */
export function MediaThumb({
  src,
  alt,
  filename,
  isVideo,
  className,
  imgClassName,
  eager,
}: {
  src?: string;
  alt: string;
  filename?: string;
  isVideo?: boolean;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = src && !failed;
  return (
    <div className={cn('relative overflow-hidden bg-surface-alt', className)}>
      {showImage ? (
        <>
          {!loaded && <div aria-hidden className="skeleton absolute inset-0" />}
          <img
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn('size-full object-cover transition-opacity duration-[var(--dur-slow)]', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
          />
        </>
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex size-full flex-col items-center justify-center gap-1.5 bg-[repeating-linear-gradient(135deg,var(--surface-alt)_0_10px,var(--surface-hover)_10px_20px)] p-3 text-center text-ink-3"
        >
          <ImageOff className="size-5" aria-hidden />
          <span className="line-clamp-2 max-w-full text-label font-medium break-all">{filename || 'Preview unavailable'}</span>
        </div>
      )}
      {isVideo && (
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-media-glass px-2 py-0.5 text-label font-semibold text-on-media">
          <PlayCircle className="size-3.5" aria-hidden /> Video
        </span>
      )}
    </div>
  );
}
