/** Couleurs de fond pour les avatars à initiales — cycle stable par nom (pas de couleur assignée au hasard, pour rester déterministe entre deux rendus). */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-red-100 text-red-800",
  "bg-purple-100 text-purple-800",
  "bg-indigo-100 text-indigo-800",
] as const;

/** Initiales (1-2 lettres) à partir d'un nom — "Frédéric Vaysse" -> "FV", "Acme" -> "A", "" -> "?". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Couleur déterministe (même nom -> toujours la même couleur) via un hash simple de la chaîne. */
export function getAvatarColor(name: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}
