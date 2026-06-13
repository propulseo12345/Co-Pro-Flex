// ============================================================================
// Logger structuré partagé — Fonctions Edge (Deno)
// ----------------------------------------------------------------------------
// Pourquoi : les fonctions Edge tournent sous Deno (pas l'app Next.js), donc le
// logger de `src/lib/utils/logger.ts` n'y est pas importable. Ici, `console` EST
// l'API de journalisation standard : Supabase capture stdout/stderr et l'affiche
// dans le dashboard. Ce module centralise ces appels pour un format cohérent
// (une ligne JSON par log), et reste le SEUL endroit autorisé à appeler `console`
// dans `supabase/functions/**` (la règle `no-console` reste active ailleurs pour
// rattraper tout appel direct futur).
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  ts: string;
  msg: string;
  ctx?: LogContext;
}

function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  const entry: LogEntry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...(ctx && Object.keys(ctx).length > 0 ? { ctx } : {}),
  };
  const line = JSON.stringify(entry);
  // console.error / console.warn sont autorisés par la config (no-console allow).
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // console.log est le seul à devoir être explicitement autorisé ici : ce module
  // est le point d'entrée unique du logging Edge (la règle reste active ailleurs).
  // eslint-disable-next-line no-console
  else console.log(line);
}

/**
 * Logger structuré pour les fonctions Edge. Sortie : une ligne JSON
 * `{level, ts, msg, ctx?}` captée par le dashboard Supabase.
 */
export const log = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),
};
