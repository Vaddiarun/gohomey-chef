export const isRemoteMediaUrl = (url?: string | null) =>
  typeof url === 'string' && /^https?:\/\//i.test(url);

export const isDisplayableRemoteImage = (url?: string | null) =>
  typeof url === 'string' && /^https:\/\//i.test(url);

export const resolveBackendMediaUrl = (url?: string | null) => {
  if (!url || url.startsWith('file://')) return null;
  if (isRemoteMediaUrl(url)) return url;

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  const base = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;

  return base ? `${base}${path}` : null;
};

export const resolveImageSource = (url?: string | null, fallback?: any) => {
  const resolvedUrl = resolveBackendMediaUrl(url);
  return resolvedUrl ? { uri: resolvedUrl } : fallback ?? null;
};
