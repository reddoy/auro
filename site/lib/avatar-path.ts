export type AvatarPathInput = {
  firstName?: string | null;
  lastName?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  fallbackId?: string | null;
  ext: string;
};

function slugPart(value?: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortId(value?: string | null): string {
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
}

function emailLocalPart(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  return slugPart(email.split('@')[0] || '');
}

export function buildAvatarFolderName(input: Omit<AvatarPathInput, 'ext'>): string {
  const first = slugPart(input.firstName);
  const last = slugPart(input.lastName);
  const nameBase = [first, last].filter(Boolean).join('-') || emailLocalPart(input.ownerEmail) || 'user';
  const idBase = shortId(input.ownerId) || shortId(input.fallbackId) || 'anon';
  return `${nameBase}-${idBase}`;
}

export function buildAvatarObjectPath(input: AvatarPathInput): string {
  const cleanExt = (input.ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const folder = buildAvatarFolderName(input);
  return `profiles/${folder}/profile.${cleanExt}`;
}

