/**
 * Hook to handle navigation blocking with unsaved changes
 * Manages beforeunload and popstate events
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const router = useRouter();
  const [showNavigateAwayDialog, setShowNavigateAwayDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const hasGuardState = useRef(false);

  // Warn before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercept browser back/forward navigation
  useEffect(() => {
    if (!hasUnsavedChanges) {
      hasGuardState.current = false;
      return;
    }

    const handlePopState = () => {
      if (hasUnsavedChanges && hasGuardState.current) {
        window.history.pushState(null, '', window.location.pathname);
        setShowNavigateAwayDialog(true);
      }
    };

    if (!hasGuardState.current) {
      window.history.pushState(null, '', window.location.pathname);
      hasGuardState.current = true;
    }

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleConfirmNavigateAway = useCallback(() => {
    setShowNavigateAwayDialog(false);
    const navPath = pendingNavigation;
    setPendingNavigation(null);
    
    if (navPath) {
      router.push(navPath);
    } else {
      window.history.back();
    }
  }, [router, pendingNavigation]);

  const handleCancelNavigateAway = useCallback(() => {
    setShowNavigateAwayDialog(false);
    setPendingNavigation(null);
  }, []);

  const navigateWithCheck = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowNavigateAwayDialog(true);
    } else {
      router.push(path);
    }
  }, [hasUnsavedChanges, router]);

  return {
    showNavigateAwayDialog,
    handleConfirmNavigateAway,
    handleCancelNavigateAway,
    navigateWithCheck,
  };
}

