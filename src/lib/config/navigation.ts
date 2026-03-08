import {
  LayoutDashboard, Users, Building2, DollarSign, Wrench,
  FileText, MessageSquare, Scale, Calendar,
  Calculator, Receipt, ArrowLeftRight, FolderOpen, Mail,
  AlertTriangle, BookOpen, ClipboardList, BarChart3,
  type LucideIcon
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  subPages: SubPage[];
}

export interface SubPage {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    subPages: [],
  },
  {
    id: 'ag',
    label: 'AG',
    icon: Users,
    href: '/ag/dashboard',
    subPages: [
      { label: 'Tableau de bord', href: '/ag/dashboard', icon: LayoutDashboard },
      { label: 'Nouvelle AG', href: '/ag/new', icon: Calendar },
      { label: 'Bibliothèque des résolutions', href: '/ag/resolutions', icon: BookOpen },
    ],
  },
  {
    id: 'copropriete',
    label: 'Copropriete',
    icon: Building2,
    href: '/coproprietaires',
    subPages: [
      { label: 'Copropriétaires', href: '/coproprietaires', icon: Users },
      { label: 'Tantièmes', href: '/finance/tantiemes', icon: BarChart3 },
      { label: 'Lots', href: '/settings/info', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    href: '/finance/comptabilite',
    subPages: [
      { label: 'Comptabilité', href: '/finance/comptabilite', icon: Calculator },
      { label: 'Budgets', href: '/finance/budgets', icon: FileText },
      { label: 'Factures', href: '/finance/factures', icon: Receipt },
      { label: 'Appels de fonds', href: '/finance/appels-fonds', icon: DollarSign },
      { label: 'Mouvements bancaires', href: '/finance/mouvements-bancaires', icon: ArrowLeftRight },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    href: '/maintenance/logbook',
    subPages: [
      { label: "Carnet d'entretien", href: '/maintenance/logbook', icon: BookOpen },
      { label: 'Contrats', href: '/maintenance/contracts', icon: ClipboardList },
      { label: 'Prestataires', href: '/maintenance/providers', icon: Users },
      { label: 'Ordres de service', href: '/maintenance/service-orders', icon: Wrench },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    href: '/documents/ged',
    subPages: [
      { label: 'GED — Mes documents', href: '/documents/ged', icon: FolderOpen },
      { label: 'Courrier officiel', href: '/communication/mail', icon: Mail },
      { label: 'État daté', href: '/documents/etat-date', icon: FileText },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    href: '/communication/mur',
    subPages: [
      { label: 'Mur', href: '/communication/mur', icon: MessageSquare },
      { label: 'Calendrier', href: '/communication/evenements', icon: Calendar },
    ],
  },
  {
    id: 'contentieux',
    label: 'Contentieux',
    icon: Scale,
    href: '/contentieux/impayes',
    subPages: [
      { label: 'Impayés', href: '/contentieux/impayes', icon: AlertTriangle },
      { label: 'Litiges', href: '/contentieux/litiges', icon: Scale },
    ],
  },
];

/** Detect active module from pathname */
export function getActiveModule(pathname: string): ModuleConfig | undefined {
  // Check subPages first for exact match
  for (const mod of MODULES) {
    if (mod.subPages.some(sp => pathname.startsWith(sp.href))) return mod;
  }
  // Fallback: check module href prefix
  return MODULES.find(mod => pathname.startsWith(mod.href));
}
