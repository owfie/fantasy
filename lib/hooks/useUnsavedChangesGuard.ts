/**
 * Hook to handle navigation blocking with unsaved changes
 * Manages beforeunload and popstate events
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [showNavigateAwayDialog, setShowNavigateAwayDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const hasGuardState = useRef(false);
  const initialPathname = useRef<string | null>(null);

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
  // Only trigger for actual navigation away, not for intercepted routes (modals/drawers)
  useEffect(() => {
    if (!hasUnsavedChanges) {
      hasGuardState.current = false;
      initialPathname.current = null;
      return;
    }

    // Store initial pathname when guard becomes active
    if (!initialPathname.current) {
      initialPathname.current = pathname;
    }

    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges && hasGuardState.current) {
        // Small delay to let Next.js update the pathname
        setTimeout(() => {
          const currentPath = window.location.pathname;
          const wasOnFantasy = initialPathname.current?.startsWith('/fantasy') ?? false;
          const isFantasyRoute = currentPath.startsWith('/fantasy');
          const isPlayerRoute = currentPath.startsWith('/players');
          
          // If we're navigating to a player route from fantasy, it's an intercepted route (modal)
          // Don't show the guard for intercepted routes
          if (wasOnFantasy && isPlayerRoute) {
            // This is an intercepted route (modal/drawer) - don't block it
            // Update the initial pathname to the new route so we track from here
            initialPathname.current = currentPath;
            return;
          }
          
          // If we're still on fantasy routes, don't block (might be modal or internal navigation)
          if (wasOnFantasy && isFantasyRoute) {
            // Still on fantasy page - don't block
            initialPathname.current = currentPath;
            return;
          }

          // This is a real navigation away - show the guard
          window.history.pushState(null, '', window.location.pathname);
          setShowNavigateAwayDialog(true);
        }, 0);
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
  }, [hasUnsavedChanges, pathname]);

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
