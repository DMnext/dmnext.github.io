/* ============================================
   DMlabs Portfolio — Main Script
   Theme toggle, search, left sidebar fullscreen/small toggle
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

  // --- Search & Category Filtering ---
  const searchInput = document.getElementById('search-input');
  const projectCards = document.querySelectorAll('.project-card');
  const noResults = document.getElementById('no-results');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let activeCategory = "all";

  // Cache card text at startup to avoid DOM reads on every keystroke
  const cardDataCache = Array.from(projectCards).map(card => ({
    el: card,
    category: card.getAttribute("data-category") || "",
    text: [
      card.querySelector(".card-title")?.textContent || "",
      card.querySelector(".card-desc")?.textContent || "",
      card.querySelector(".card-badge")?.textContent || "",
      Array.from(card.querySelectorAll(".tag-pill")).map(p => p.textContent).join(" ")
    ].join(" ").toLowerCase()
  }));

  function applyProjectFilters() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let visibleCount = 0;

    cardDataCache.forEach(({ el, category, text }) => {
      const matchesCat = (activeCategory === "all" || category === activeCategory);

      if (!matchesCat) {
        el.classList.add("hidden");
        return;
      }

      const matchesQuery = !query || text.includes(query);

      el.classList.toggle("hidden", !matchesQuery);
      if (matchesQuery) visibleCount++;
    });

    if (noResults) {
      noResults.classList.toggle("visible", visibleCount === 0);
    }
  }

  // Debounce search input to avoid filtering on every keystroke
  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyProjectFilters, 150);
    });
  }

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        activeCategory = btn.getAttribute('data-category') || 'all';
        applyProjectFilters();
      });
    });
  }

  // --- Sidebar & Curtain Drag / Swipe Engine (3-State: Minimized, Small, Fullscreen) ---
  const sidebar = document.getElementById('sidebar');
  const sidebarHandle = document.getElementById('sidebar-handle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');
  const mainContent = document.querySelector('.main-content');
  const sidebarBg = sidebar ? sidebar.querySelector('.sidebar-bg') : null;
  const sidebarInner = sidebar ? sidebar.querySelector('.sidebar-inner') : null;

  const SLIVER_WIDTH = 34; // px visible in collapsed/minimized state

  function isSmallScreen() {
    return window.innerWidth < 1024;
  }

  function getSidebarWidth() {
    return (sidebar && sidebar.offsetWidth) || (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || 320);
  }

  // Explicit 3-State Model: 'minimized', 'small', 'fullscreen'
  function getSidebarState() {
    if (!sidebar) return 'small';
    if (isSmallScreen()) {
      if (sidebar.classList.contains('fullscreen') || sidebar.classList.contains('open')) {
        return 'fullscreen';
      }
      return 'minimized';
    } else {
      if (sidebar.classList.contains('fullscreen')) {
        return 'fullscreen';
      }
      if (sidebar.classList.contains('collapsed')) {
        return 'minimized';
      }
      return 'small';
    }
  }

  function applyCurtain(offsetPx, totalWidth) {
    if (!sidebar || !totalWidth) return;
    const clampedX = Math.min(0, Math.max(-totalWidth, offsetPx));
    const progress = Math.max(0, Math.min(1, (totalWidth + clampedX) / totalWidth));

    // Slide sidebar
    sidebar.style.transform = `translateX(${clampedX}px)`;

    // Background counter-parallax & slight scale
    if (sidebarBg) {
      const bgOffset = -clampedX * 0.28;
      sidebarBg.style.transform = `translateX(${bgOffset}px) scale(1.04)`;
    }

    // Inner content parallax & soft fade
    if (sidebarInner) {
      const innerOffset = clampedX * 0.15;
      sidebarInner.style.transform = `translateX(${innerOffset}px)`;
      sidebarInner.style.opacity = Math.max(0.1, progress).toFixed(3);
    }

    // Backdrop opacity for fullscreen or mobile
    if (sidebarOverlay) {
      if (getSidebarState() === 'fullscreen' || isSmallScreen()) {
        sidebarOverlay.classList.add('active');
        sidebarOverlay.style.opacity = Math.max(0, progress).toFixed(3);
      }
    }
  }

  function resetCurtainStyles() {
    if (sidebar) {
      sidebar.style.transform = '';
      sidebar.style.width = '';
      sidebar.style.boxShadow = '';
    }
    if (sidebarBg) sidebarBg.style.transform = '';
    if (sidebarInner) {
      sidebarInner.style.transform = '';
      sidebarInner.style.opacity = '';
    }

  }

  function setSidebarState(targetState) {
    if (!sidebar) return;
    resetCurtainStyles();
    sidebar.classList.remove('sliding');

    if (targetState === 'fullscreen') {
      sidebar.classList.remove('collapsed');
      sidebar.classList.add('fullscreen', 'open');
      document.body.style.overflow = 'hidden';
      if (sidebarOverlay) {
        sidebarOverlay.classList.add('active');
        sidebarOverlay.style.opacity = '1';
      }
      if (sidebarHandle) {
        sidebarHandle.setAttribute('title', 'Return to small side bar');
        sidebarHandle.setAttribute('aria-label', 'Return to small side bar');
      }
    } else if (targetState === 'small') {
      sidebar.classList.remove('fullscreen', 'collapsed');
      sidebar.classList.add('open');
      document.body.style.overflow = '';
      if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        sidebarOverlay.style.opacity = '';
      }
      if (sidebarHandle) {
        sidebarHandle.setAttribute('title', 'Expand to fullscreen');
        sidebarHandle.setAttribute('aria-label', 'Expand to fullscreen');
      }
    } else if (targetState === 'minimized') {
      sidebar.classList.remove('fullscreen', 'open');
      if (isSmallScreen()) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.add('collapsed');
      }
      document.body.style.overflow = '';
      if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        sidebarOverlay.style.opacity = '';
      }
      if (sidebarHandle) {
        sidebarHandle.setAttribute('title', 'Expand sidebar');
        sidebarHandle.setAttribute('aria-label', 'Expand sidebar');
      }
    }
  }

  function toggleSidebar() {
    const current = getSidebarState();
    if (current === 'fullscreen') {
      // In fullscreen: return to small (desktop) or minimized (mobile)
      setSidebarState(isSmallScreen() ? 'minimized' : 'small');
    } else if (current === 'small') {
      // In small panel mode: MAXIMIZE TO FULLSCREEN
      setSidebarState('fullscreen');
    } else if (current === 'minimized') {
      // In minimized sliver: open to small (desktop) or fullscreen (mobile)
      setSidebarState(isSmallScreen() ? 'fullscreen' : 'small');
    }
  }

  // ============================================
  // Gesture Handling: Drag / Swipe Left & Right in All States
  // ============================================
  let isDragging = false;
  let gestureInitialState = null;
  let dragMode = null; // 'close_fullscreen', 'close_small', 'expand_fullscreen', 'open_minimized'
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let startWidth = 0;
  let didDrag = false;

  function onGestureStart(clientX, clientY) {
    startX = clientX;
    startY = clientY;
    startTime = performance.now();
    isDragging = false;
    didDrag = false;
    dragMode = null;
    gestureInitialState = getSidebarState();
    startWidth = getSidebarWidth();
  }

  function onGestureMove(clientX, clientY, e) {
    if (!gestureInitialState) return;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    if (!isDragging) {
      // Threshold check: movement > 8px and primarily horizontal
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        if (gestureInitialState === 'fullscreen' && deltaX < 0) {
          dragMode = 'close_fullscreen';
          isDragging = true;
          didDrag = true;
          sidebar.classList.add('sliding');
        } else if (gestureInitialState === 'small') {
          if (deltaX < 0) {
            // Drag left: minimize small panel
            dragMode = 'close_small';
            isDragging = true;
            didDrag = true;
            sidebar.classList.add('sliding');
          } else if (deltaX > 0) {
            // Drag right: MAXIMIZE small panel to fullscreen
            dragMode = 'expand_fullscreen';
            isDragging = true;
            didDrag = true;
            sidebar.classList.add('sliding');
          }
        } else if (gestureInitialState === 'minimized' && deltaX > 0) {
          dragMode = 'open_minimized';
          isDragging = true;
          didDrag = true;
          sidebar.classList.add('sliding');
        }
      }
    }

    if (isDragging && dragMode) {
      if (e && e.cancelable) e.preventDefault();

      if (dragMode === 'close_fullscreen') {
        applyCurtain(deltaX, window.innerWidth);
      } else if (dragMode === 'close_small') {
        applyCurtain(deltaX, startWidth);
      } else if (dragMode === 'expand_fullscreen') {
        // Interactively expand width from startWidth towards window.innerWidth
        const maxDelta = window.innerWidth - startWidth;
        const currentDelta = Math.min(maxDelta, Math.max(0, deltaX));
        const currentW = startWidth + currentDelta;
        sidebar.style.width = `${currentW}px`;
        sidebar.style.boxShadow = '14px 0 50px rgba(0, 0, 0, 0.65)';
        if (sidebarOverlay && maxDelta > 0) {
          sidebarOverlay.classList.add('active');
          sidebarOverlay.style.opacity = Math.max(0, Math.min(1, currentDelta / maxDelta)).toFixed(3);
        }
      } else if (dragMode === 'open_minimized') {
        const totalW = isSmallScreen() ? window.innerWidth : startWidth;
        const maxOffset = totalW - SLIVER_WIDTH;
        const offset = -maxOffset + Math.min(maxOffset, Math.max(0, deltaX));
        applyCurtain(offset, totalW);
      }
    }
  }

  function onGestureEnd(clientX, clientY) {
    if (!gestureInitialState) return;
    const activeMode = dragMode;
    gestureInitialState = null;
    dragMode = null;

    if (!isDragging) {
      return;
    }

    isDragging = false;
    sidebar.classList.remove('sliding');

    const deltaX = clientX - startX;
    const duration = Math.max(1, performance.now() - startTime);
    const velocity = deltaX / duration; // px per ms

    if (activeMode === 'close_fullscreen') {
      if (deltaX < -50 || velocity < -0.25) {
        setSidebarState(isSmallScreen() ? 'minimized' : 'small');
      } else {
        setSidebarState('fullscreen');
      }
    } else if (activeMode === 'close_small') {
      if (deltaX < -45 || velocity < -0.25) {
        setSidebarState('minimized');
      } else {
        setSidebarState('small');
      }
    } else if (activeMode === 'expand_fullscreen') {
      if (deltaX > 45 || velocity > 0.25) {
        setSidebarState('fullscreen');
      } else {
        setSidebarState('small');
      }
    } else if (activeMode === 'open_minimized') {
      if (deltaX > 45 || velocity > 0.25) {
        setSidebarState(isSmallScreen() ? 'fullscreen' : 'small');
      } else {
        setSidebarState('minimized');
      }
    }

    setTimeout(() => {
      didDrag = false;
    }, 120);
  }

  // Pointer Event Listeners (Mouse & modern touch)
  if (sidebar) {
    sidebar.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      onGestureStart(e.clientX, e.clientY);
    });
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (getSidebarState() === 'minimized' && e.clientX <= SLIVER_WIDTH + 36) {
      onGestureStart(e.clientX, e.clientY);
    }
  });

  window.addEventListener('pointermove', (e) => {
    onGestureMove(e.clientX, e.clientY, e);
  }, { passive: false });

  window.addEventListener('pointerup', (e) => {
    onGestureEnd(e.clientX, e.clientY);
  });

  window.addEventListener('pointercancel', (e) => {
    onGestureEnd(e.clientX, e.clientY);
  });

  // Touch Event Listeners (fallback for browsers without PointerEvent support)
  if (!window.PointerEvent) {
    if (sidebar) {
      sidebar.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        onGestureStart(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
    }

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      if (getSidebarState() === 'minimized' && e.touches[0].clientX <= SLIVER_WIDTH + 36) {
        onGestureStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1) return;
      onGestureMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.changedTouches.length) {
        const touch = e.changedTouches[0];
        onGestureEnd(touch.clientX, touch.clientY);
      }
    }, { passive: true });
  }

  // Suppress accidental click navigation on links if user was dragging
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      if (didDrag) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  // Handle click / tap on the sidebar edge handle
  if (sidebarHandle) {
    sidebarHandle.addEventListener('click', (e) => {
      if (didDrag) return;
      e.stopPropagation();
      toggleSidebar();
    });

    sidebarHandle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSidebar();
      }
    });
  }

  // Hamburger button toggles sidebar
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      toggleSidebar();
    });
  }

  // Backdrop overlay click restores/closes sidebar
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      const current = getSidebarState();
      if (current === 'fullscreen') {
        setSidebarState(isSmallScreen() ? 'minimized' : 'small');
      } else {
        setSidebarState('minimized');
      }
    });
  }

  // Close button (if any exists in DOM)
  if (sidebarClose) {
    sidebarClose.addEventListener('click', (e) => {
      e.stopPropagation();
      setSidebarState(isSmallScreen() ? 'minimized' : 'small');
    });
  }

  // Nav links close sidebar on small screen
  if (sidebar) {
    sidebar.querySelectorAll('.sidebar-nav a, .brand-name a, .brand-logo-link').forEach(link => {
      link.addEventListener('click', () => {
        if (isSmallScreen()) {
          setSidebarState('minimized');
        }
      });
    });
  }

  // Escape key returns to small/minimized
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const current = getSidebarState();
      if (current === 'fullscreen') {
        setSidebarState(isSmallScreen() ? 'minimized' : 'small');
      } else if (current === 'small' && isSmallScreen()) {
        setSidebarState('minimized');
      }
    }
  });

  // Handle window resizing
  window.addEventListener('resize', () => {
    resetCurtainStyles();
    const currentState = getSidebarState();
    if (currentState === 'fullscreen') {
      document.body.style.overflow = 'hidden';
      if (sidebarOverlay) {
        sidebarOverlay.classList.add('active');
        sidebarOverlay.style.opacity = '1';
      }
    } else {
      document.body.style.overflow = '';
      if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        sidebarOverlay.style.opacity = '';
      }
    }
  });

});
