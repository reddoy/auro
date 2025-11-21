import { cookies } from 'next/headers';

export const IOS_SOURCE_COOKIE = 'auro_ios_src';

export function hasIosSourceFlag(): boolean {
  try {
    const store = cookies();
    return store.get(IOS_SOURCE_COOKIE)?.value === '1';
  } catch {
    return false;
  }
}


