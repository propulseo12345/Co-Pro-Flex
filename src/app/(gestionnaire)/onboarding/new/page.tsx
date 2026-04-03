// Redirect vers /onboarding/create — cette route est dépréciée
import { redirect } from 'next/navigation';

export default function OnboardingNewRedirect() {
  redirect('/onboarding/create');
}
