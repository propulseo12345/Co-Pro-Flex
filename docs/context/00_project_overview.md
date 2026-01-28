# CoProFlex - Project Overview

## Purpose

CoProFlex is a SaaS platform for property management (copropriété) targeting the French market.

## Core Functional Modules

| Module | Description |
|--------|-------------|
| **Assemblées Générales (AG)** | Draft creation, resolution management, votes compliant with French law (articles 24-26), PV generation |
| **Finance** | Budgets (operational/works/ALUR), calls for funds, general ledger accounting, unpaid reminders |
| **Maintenance** | Maintenance logbook, provider contracts, service orders |
| **Documents** | Electronic document management with confidentiality levels, versioning |
| **Communication** | Private messaging, community wall, events, email campaigns |
| **Ventes & Mutations** | Property sale workflow, dated statements |

## Target Users

| Role | Access Level |
|------|--------------|
| `ADMIN` | Full access |
| `SYNDIC` | Property manager, write access |
| `PRESIDENT_CS` | Syndic council president, extended read access |
| `MEMBRE_CS` | Syndic council member, read access |
| `COPROPRIETAIRE` | Own data only (unit, payments) |
| `LOCATAIRE` | Minimal access (planned) |

## Current State

| Aspect | Status |
|--------|--------|
| Frontend | Functional with mixed mock/Supabase data |
| Backend (Supabase) | Schema complete (45 migrations, 62 tables) |
| Pages | ~100 functional pages |
| Single-Copro Mode | Active (multi-copro backend preserved) |

## Intentional Simplifications

1. **Single-Copro Mode**: UI assumes one active copropriété (commit `4dc65c1`, 2026-01-27)
2. **isManager hardcoded**: Set to `true` in CoproContext for simplified permissions
3. **Dashboard**: Static data (`DASHBOARD_USE_SUPABASE = false`)
4. **Budget/Ventes modules**: Using mock data (`BUDGET_USE_SUPABASE = false`, `VENTES_USE_SUPABASE = false`)

## Key Metrics

| Metric | Value |
|--------|-------|
| Functional pages | ~100 |
| Business hooks | 56 |
| Services | 18 |
| Supabase tables | 62 |
| Supabase views | 20+ |
| Edge Functions | 20 |
| RPC Functions | 104+ |
| Migrations | 45 |
| PDF generators | 10 |
