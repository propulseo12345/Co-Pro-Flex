'use client';

import { redirect } from 'next/navigation';

/**
 * Redirection vers la page principale des événements (Supabase)
 * La page /social/events est dépréciée au profit de /communication/evenements
 */
export default function EventsPage() {
  redirect('/communication/evenements');
}
