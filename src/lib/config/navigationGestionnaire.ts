import {
  Briefcase, BarChart3, Calendar, Users,
  FileText, Receipt, Settings, ClipboardList,
  type LucideIcon
} from 'lucide-react';

export interface GestionnaireSubPage {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export interface GestionnaireModuleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  subPages?: GestionnaireSubPage[];
}

export const GESTIONNAIRE_MODULES: GestionnaireModuleConfig[] = [
  {
    id: 'portefeuille',
    label: 'Portefeuille',
    icon: Briefcase,
    href: '/portefeuille',
    subPages: [
      { label: 'Mes copropriétés', href: '/portefeuille' },
      { label: 'Onboarding', href: '/onboarding', icon: ClipboardList },
    ],
  },
  { id: 'reporting', label: 'Reporting', icon: BarChart3, href: '/reporting' },
  { id: 'agenda', label: 'Agenda global', icon: Calendar, href: '/agenda' },
  { id: 'prestataires', label: 'Prestataires', icon: Users, href: '/prestataires' },
  { id: 'modeles', label: 'Modèles', icon: FileText, href: '/modeles' },
  { id: 'facturation', label: 'Facturation', icon: Receipt, href: '/facturation' },
  { id: 'parametres', label: 'Paramètres', icon: Settings, href: '/parametres-cabinet' },
];
