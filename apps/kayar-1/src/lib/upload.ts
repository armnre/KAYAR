import { useCallback, useState } from 'react';
import { readCookie } from './api-client';

/**
 * Real upload: the file is posted to the API (multipart), the server stores it on
 * the configured storage and returns the public URL.
 */
export function useUpload() {
  const [isUploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const csrf = readCookie('kayar_csrf');
      const body = new FormData();
      body.append('file', file);
      const res = await fetch((import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/upload', {
        method: 'POST',
        credentials: 'include',
        headers: csrf ? ({ 'x-csrf-token': csrf } as Record<string, string>) : {},
        body,
      });
      const text = await res.text();
      let data: { url?: string; size?: number; mime?: string; error?: { userFacingMessage?: string } } | null = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!res.ok || !data?.url) {
        throw new Error(data?.error?.userFacingMessage ?? 'آپلود فایل انجام نشد؛ دوباره تلاش کن.');
      }
      return { url: data.url, size: data.size ?? file.size, mime: data.mime ?? file.type };
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, isUploading };
}
