import { cookies } from 'next/headers';
import { IOS_SOURCE_COOKIE } from './ios-source-constants';

// Re-export constant for backwards compatibility
export { IOS_SOURCE_COOKIE };

// Server-only function for Server Components (uses next/headers which is server-only)
export function hasIosSourceFlag(): boolean {
  try {
    const store = cookies();
    return store.get(IOS_SOURCE_COOKIE)?.value === '1';
  } catch {
    return false;
  }
}


