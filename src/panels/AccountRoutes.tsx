import { ActivityPanel, ProfilePanel } from './AccountPanels';

export function AccountRoutes({ section }: { section: 'actividad' | 'perfil' }) {
  return section === 'actividad' ? <ActivityPanel /> : <ProfilePanel />;
}
