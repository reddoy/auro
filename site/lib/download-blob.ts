/** Trigger a browser file download from a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // iOS Safari needs the object URL briefly after click before revoke.
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

/** Fetch a URL as a Blob and trigger download. */
export async function downloadUrlAsFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

function extensionFromUrlOrType(url: string, contentType: string | null): string {
  const path = url.split('?')[0] || '';
  const match = path.match(/\.([a-zA-Z0-9]+)$/);
  if (match?.[1]) return match[1].toLowerCase();
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('gif')) return 'gif';
  if (contentType?.includes('heic') || contentType?.includes('heif')) return 'heic';
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  return 'jpg';
}

/** Fetch image URLs, pack into a ZIP, and download. */
export async function downloadUrlsAsZip(
  urls: string[],
  zipFilename: string,
  filePrefix = 'photo'
): Promise<void> {
  if (urls.length === 0) {
    throw new Error('No files to download');
  }
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  await Promise.all(
    urls.map(async (url, index) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Could not fetch photo ${index + 1}`);
      }
      const blob = await res.blob();
      const ext = extensionFromUrlOrType(url, res.headers.get('content-type'));
      zip.file(`${filePrefix}-${index + 1}.${ext}`, blob);
    })
  );

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, zipFilename);
}

/** Sanitize a string for use in a download filename. */
export function slugForFilename(value: string, fallback = 'file'): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}
