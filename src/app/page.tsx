import { redirect } from 'next/navigation';

export default function Home() {
  // Rediriger vers le dashboard
  // Plus tard : vérifier l'auth et rediriger vers /login si non connecté
  redirect('/dashboard');
}
