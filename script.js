/* ============================================
   DMlabs Portfolio — Main Script
   Theme toggle, search, mobile menu, sidebar sliver & resize
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Toggle ---
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const iconSun = themeToggle.querySelector('.icon-sun');
  const iconMoon = themeToggle.querySelector('.icon-moon');
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('dm-theme', theme);

    if (theme === 'light') {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block';
      if (metaThemeColor) metaThemeColor.content = '#f8fafb';
    } else {
      iconSun.style.display = 'block';
      iconMoon.style.display = 'none';
      if (metaThemeColor) metaThemeColor.content = '#0a0f1a';
    }

    // Dispatch custom event for Three.js module
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  const savedTheme = localStorage.getItem('dm-theme') || 'dark';
  setTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // --- Search Filtering ---
  const searchInput = document.getElementById('search-input');
  const projectCards = document.querySelectorAll('.project-card');
  const noResults = document.getElementById('no-results');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      let visibleCount = 0;

      projectCards.forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
        const matches = !query || title.includes(query) || desc.includes(query);

        card.classList.toggle('hidden', !matches);
        if (matches) visibleCount++;
      });

      noResults.classList.toggle('visible', visibleCount === 0);
    });
  }

  // --- Elements for Sidebar & Interactions ---
  const sidebar = document.getElementById('sidebar');
  const dragHandle = document.getElementById('sidebar-drag-handle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');
  const mainContent = document.getElementById('main-content');

  const SLIVER_WIDTH = 34; // px peeking on right edge in small screen
  const DEFAULT_DESKTOP_WIDTH = 300;
  const MIN_DESKTOP_WIDTH = 260;

  function isSmallScreen() {
    return window.innerWidth < 1024;
  }

  let isSidebarOpen = false;

  // --- Open / Close functions for Mobile / Small Screen ---
  function openSidebarMobile() {
    isSidebarOpen = true;
    sidebar.classList.add('open');
    sidebar.style.transform = '';
    sidebarOverlay.classList.add('active');
    sidebarOverlay.style.opacity = '1';
    document.body.style.overflow = 'hidden';
    dragHandle.setAttribute('title', 'Press or slide right to return to original size');
    dragHandle.setAttribute('aria-label', 'Return to original size');
  }

  function closeSidebarMobile() {
    isSidebarOpen = false;
    sidebar.classList.remove('open');
    sidebar.style.transform = '';
    sidebarOverlay.classList.remove('active');
    sidebarOverlay.style.opacity = '';
    document.body.style.overflow = '';
    dragHandle.setAttribute('title', 'Press or slide left to open full screen');
    dragHandle.setAttribute('aria-label', 'Open full screen');
  }

  // --- Desktop Width functions ---
  function getDesktopWidth() {
    return sidebar.getBoundingClientRect().width;
  }

  function setDesktopWidth(width) {
    const maxWidth = window.innerWidth;
    const clamped = Math.max(MIN_DESKTOP_WIDTH, Math.min(width, maxWidth));
    sidebar.style.width = clamped + 'px';
    mainContent.style.marginRight = clamped + 'px';
    document.documentElement.style.setProperty('--sidebar-width', clamped + 'px');

    if (clamped >= maxWidth - 15) {
      sidebar.classList.add('full-screen');
    } else {
      sidebar.classList.remove('full-screen');
    }

    window.dispatchEvent(new Event('resize'));
  }

  function restoreOriginalSize() {
    if (isSmallScreen()) {
      closeSidebarMobile();
    } else {
      // Desktop: restore to saved or default width
      const saved = parseInt(localStorage.getItem('dm-sidebar-width'), 10) || DEFAULT_DESKTOP_WIDTH;
      const targetWidth = (saved >= window.innerWidth - 20) ? DEFAULT_DESKTOP_WIDTH : saved;
      setDesktopWidth(targetWidth);
      localStorage.setItem('dm-sidebar-width', targetWidth);
    }
  }

  // --- Close button handler (Works for both mobile and desktop full-screen) ---
  if (sidebarClose) {
    sidebarClose.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreOriginalSize();
    });
  }

  // --- Overlay click handler ---
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      restoreOriginalSize();
    });
  }

  // --- Hamburger button handler ---
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      if (isSmallScreen()) {
        if (isSidebarOpen) {
          closeSidebarMobile();
        } else {
          openSidebarMobile();
        }
      }
    });
  }

  // --- Navigation links close on mobile ---
  sidebar.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (isSmallScreen()) closeSidebarMobile();
    });
  });

  // --- Keyboard (Escape key) to restore ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isSmallScreen() && isSidebarOpen) {
        closeSidebarMobile();
      } else if (!isSmallScreen() && sidebar.classList.contains('full-screen')) {
        restoreOriginalSize();
      }
    }
  });

  // ============================================
  // Pointer / Touch / Drag handling on the handle
  // ============================================
  let isPointerActive = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let startDesktopWidth = 0;
  let hasMovedFarEnough = false;

  function onPointerDown(e) {
    // Only primary button or touch
    if (e.button !== undefined && e.button !== 0) return;

    isPointerActive = true;
    hasMovedFarEnough = false;
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();

    if (!isSmallScreen()) {
      startDesktopWidth = getDesktopWidth();
    }

    sidebar.classList.add('dragging');
    dragHandle.classList.add('active');

    try {
      dragHandle.setPointerCapture(e.pointerId);
    } catch (_) {}

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isPointerActive) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    if (!hasMovedFarEnough && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
      hasMovedFarEnough = true;
      if (!isSmallScreen()) {
        document.body.classList.add('sidebar-resizing');
      }
    }

    if (!hasMovedFarEnough) return;

    if (isSmallScreen()) {
      // Mobile / Small resolution sliding:
      const maxOffset = window.innerWidth - SLIVER_WIDTH; // position when collapsed
      let currentOffset;

      if (!isSidebarOpen) {
        // Was collapsed: sliding left (deltaX is negative) brings it onto screen
        currentOffset = maxOffset + deltaX;
      } else {
        // Was open (full screen): sliding right (deltaX is positive) moves it off
        currentOffset = deltaX;
      }

      // Clamp offset between 0 (full screen) and maxOffset (sliver)
      const clampedOffset = Math.max(0, Math.min(currentOffset, maxOffset));
      sidebar.style.transform = `translateX(${clampedOffset}px)`;

      // Progress: 0 = sliver, 1 = full screen
      const progress = 1 - (clampedOffset / maxOffset);
      sidebarOverlay.classList.add('active');
      sidebarOverlay.style.opacity = Math.max(0, Math.min(progress, 1)).toString();
    } else {
      // Desktop resize: dragging left increases width
      const newWidth = startDesktopWidth - deltaX;
      setDesktopWidth(newWidth);
    }
  }

  function onPointerUp(e) {
    if (!isPointerActive) return;

    isPointerActive = false;
    const elapsed = performance.now() - startTime;
    const deltaX = e.clientX - startX;

    sidebar.classList.remove('dragging');
    dragHandle.classList.remove('active');
    document.body.classList.remove('sidebar-resizing');

    try {
      dragHandle.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (isSmallScreen()) {
      // Check if this was a press / tap (quick, minimal movement)
      if (!hasMovedFarEnough || (Math.abs(deltaX) < 10 && elapsed < 350)) {
        // Toggle state!
        if (isSidebarOpen) {
          closeSidebarMobile();
        } else {
          openSidebarMobile();
        }
        return;
      }

      // It was a drag / slide gesture
      const maxOffset = window.innerWidth - SLIVER_WIDTH;
      const velocity = deltaX / Math.max(elapsed, 1); // px per ms

      if (!isSidebarOpen) {
        // Started from sliver, dragging left
        // If dragged left past 25% of distance OR flicked left
        if (deltaX < -40 || deltaX < -maxOffset * 0.25 || velocity < -0.3) {
          openSidebarMobile();
        } else {
          closeSidebarMobile();
        }
      } else {
        // Started from open, dragging right
        // If dragged right past 40px or flicked right
        if (deltaX > 40 || deltaX > maxOffset * 0.25 || velocity > 0.3) {
          closeSidebarMobile();
        } else {
          openSidebarMobile();
        }
      }
    } else {
      // Desktop: persist width
      const finalWidth = getDesktopWidth();
      localStorage.setItem('dm-sidebar-width', finalWidth);
    }
  }

  dragHandle.addEventListener('pointerdown', onPointerDown);
  dragHandle.addEventListener('pointermove', onPointerMove);
  dragHandle.addEventListener('pointerup', onPointerUp);
  dragHandle.addEventListener('pointercancel', onPointerUp);

  // Fallback click on dragHandle for accessibility (e.g. keyboard Enter or Space)
  dragHandle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isSmallScreen()) {
        if (isSidebarOpen) closeSidebarMobile();
        else openSidebarMobile();
      }
    }
  });

  // Double-click on desktop to toggle full-width / default width
  dragHandle.addEventListener('dblclick', () => {
    if (isSmallScreen()) return;

    const currentWidth = getDesktopWidth();
    const fullWidth = window.innerWidth;

    if (currentWidth >= fullWidth - 20) {
      // Restore to default
      setDesktopWidth(DEFAULT_DESKTOP_WIDTH);
      localStorage.setItem('dm-sidebar-width', DEFAULT_DESKTOP_WIDTH);
    } else {
      // Expand to full screen
      setDesktopWidth(fullWidth);
      localStorage.setItem('dm-sidebar-width', fullWidth);
    }
  });

  // Swipe-to-close on mobile when touch originates inside sidebar
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwipingSidebar = false;

  sidebar.addEventListener('touchstart', (e) => {
    if (!isSmallScreen() || !isSidebarOpen) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwipingSidebar = false;
  }, { passive: true });

  sidebar.addEventListener('touchmove', (e) => {
    if (!isSmallScreen() || !isSidebarOpen) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    // Detect horizontal swipe to the right
    if (!isSwipingSidebar && deltaX > 15 && deltaX > Math.abs(deltaY) * 1.5) {
      isSwipingSidebar = true;
      sidebar.classList.add('dragging');
    }

    if (isSwipingSidebar && deltaX > 0) {
      const maxOffset = window.innerWidth - SLIVER_WIDTH;
      const clampedOffset = Math.min(deltaX, maxOffset);
      sidebar.style.transform = `translateX(${clampedOffset}px)`;

      const progress = 1 - (clampedOffset / maxOffset);
      sidebarOverlay.style.opacity = Math.max(0, progress).toString();
    }
  }, { passive: true });

  sidebar.addEventListener('touchend', (e) => {
    if (!isSmallScreen() || !isSidebarOpen || !isSwipingSidebar) return;
    sidebar.classList.remove('dragging');
    isSwipingSidebar = false;

    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - touchStartX;

    if (deltaX > 50) {
      closeSidebarMobile();
    } else {
      openSidebarMobile();
    }
  }, { passive: true });

  // --- Initial Desktop State & Window Resize ---
  if (!isSmallScreen()) {
    const savedWidth = localStorage.getItem('dm-sidebar-width');
    if (savedWidth) {
      setDesktopWidth(parseInt(savedWidth, 10));
    }
  }

  let wasSmall = isSmallScreen();
  window.addEventListener('resize', () => {
    const currentlySmall = isSmallScreen();
    if (currentlySmall && !wasSmall) {
      // Switched to small screen: reset inline desktop styles
      sidebar.style.width = '';
      sidebar.style.transform = '';
      mainContent.style.marginRight = '';
      sidebar.classList.remove('full-screen');
      if (isSidebarOpen) {
        openSidebarMobile();
      } else {
        closeSidebarMobile();
      }
    } else if (!currentlySmall && wasSmall) {
      // Switched to desktop: reset mobile classes & restore desktop width
      sidebar.style.transform = '';
      sidebarOverlay.classList.remove('active');
      sidebarOverlay.style.opacity = '';
      document.body.style.overflow = '';
      const savedWidth = localStorage.getItem('dm-sidebar-width') || DEFAULT_DESKTOP_WIDTH;
      setDesktopWidth(parseInt(savedWidth, 10));
    }
    wasSmall = currentlySmall;
  });
});
