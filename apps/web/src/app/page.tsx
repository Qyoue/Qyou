import { redirect } from 'next/navigation';

// #841: Root redirects to /login (logged-out) or will redirect to /dashboard
// once session detection is wired. This is intentional, not boilerplate.
export default function RootPage() {
  redirect('/login');
}
