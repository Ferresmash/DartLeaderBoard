import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures window and document scroll position resets to top on every route change,
 * especially handling iOS/Safari inertia and asynchronous scroll restoration.
 */
export default function ScrollToTop() {
  const { pathname, search, hash, key } = useLocation();

  useEffect(() => {
    const resetScroll = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
      // Also reset any scrollable root container if present
      const mainContainer = document.querySelector('main, #root > div');
      if (mainContainer && mainContainer.scrollTop) {
        mainContainer.scrollTop = 0;
      }
    };

    resetScroll();

    // Re-assert on requestAnimationFrame and short timeout to counter Safari history scroll restoration
    const rafId = requestAnimationFrame(resetScroll);
    const timeoutId = setTimeout(resetScroll, 50);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [pathname, search, hash, key]);

  return null;
}
