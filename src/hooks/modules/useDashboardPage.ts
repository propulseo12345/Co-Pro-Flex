import { useState, useMemo } from 'react';
import { getAllAlerts } from '@/lib/utils/alerts';

export function useDashboardPage() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showSecondaryTasks, setShowSecondaryTasks] = useState(false);
  const [showAllCopros, setShowAllCopros] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const allAlerts = useMemo(() => getAllAlerts(), []);
  const activeAlerts = allAlerts.filter(a => !dismissedAlerts.includes(a.id));

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  return {
    showNotifications,
    setShowNotifications,
    dismissedAlerts,
    showSecondaryTasks,
    setShowSecondaryTasks,
    showAllCopros,
    setShowAllCopros,
    showAllActivities,
    setShowAllActivities,
    activeAlerts,
    handleDismissAlert,
    handleBellClick,
  };
}
