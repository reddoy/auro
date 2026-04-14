import { redirect } from 'next/navigation';

export default function InternalRequestEntryPage() {
  redirect('/request?internal=1');
}
