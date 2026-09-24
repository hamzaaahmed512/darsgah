/** Keep remote image fetching out of the PDF renderer; failed logos use initials. */
export async function loadReportLogo(url: string | null | undefined, signal: AbortSignal): Promise<string | null> {
  if (!url) return null;
  try {
    const resolved = new URL(url, window.location.origin);
    if (!["https:", "http:", "data:"].includes(resolved.protocol)) return null;
    const response = await fetch(resolved.href, { signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!["image/png", "image/jpeg"].includes(blob.type) || blob.size > 2 * 1024 * 1024) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const image = new window.Image();
    image.src = dataUrl;
    await image.decode();
    return image.naturalWidth > 0 && image.naturalHeight > 0 ? dataUrl : null;
  } catch {
    return null;
  }
}
