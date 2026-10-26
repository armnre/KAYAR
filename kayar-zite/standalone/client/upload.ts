// Standalone replacement for `zitejs/upload`: stores files on the KAYAR server (/upload → /uploads/...).
import { useState } from 'react';

export class FileUploadError extends Error {}

function toBlob(data: File | Blob | ArrayBuffer | string): Blob {
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data]);
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(data);
  if (m) {
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: m[1] || 'application/octet-stream' });
  }
  return new Blob([data], { type: 'text/plain' });
}

export async function uploadFile({ data, filename }: { data: File | Blob | ArrayBuffer | string; filename: string }) {
  const blob = toBlob(data);
  const res = await fetch(`/upload?name=${encodeURIComponent(filename)}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream' } });
  if (!res.ok) throw new FileUploadError((await res.json().catch(() => ({}))).message || `Upload failed (${res.status})`);
  const { url } = await res.json();
  return { fileUrl: url as string };
}

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  const upload = async (file: File | Blob | ArrayBuffer | string, filename?: string) => {
    setUploading(true);
    try {
      const name = filename || (file instanceof File ? file.name : 'file.bin');
      const { fileUrl } = await uploadFile({ data: file, filename: name });
      return { url: fileUrl };
    } finally { setUploading(false); }
  };
  return { upload, isUploading };
}
