// ============================================================================
// Communication — Utilitaires partagés
// ============================================================================

/** Extraire les initiales d'un nom (max 2 caractères) */
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Couleur d'avatar déterministe à partir du nom */
export function getAvatarColor(name: string): string {
  const colors = ['#60a5fa', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#e879f9'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/** Formatage de date relative (Aujourd'hui → heure, Hier, jour de la semaine, date courte) */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
