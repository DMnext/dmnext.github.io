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

  function applyProjectFilters() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let visibleCount = 0;

    projectCards.forEach(card => {
      const category = card.getAttribute("data-category") || "";
      const matchesCat = (activeCategory === "all" || category === activeCategory);

      if (!matchesCat) {
        card.classList.add("hidden");
        return;
      }

      const title = card.querySelector(".card-title")?.textContent.toLowerCase() || "";
      const desc = card.querySelector(".card-desc")?.textContent.toLowerCase() || "";
      const badge = card.querySelector(".card-badge")?.textContent.toLowerCase() || "";
      const tags = Array.from(card.querySelectorAll(".tag-pill")).map(p => p.textContent.toLowerCase()).join(" ");

      const matchesQuery = !query || title.includes(query) || desc.includes(query) || badge.includes(query) || tags.includes(query);

      card.classList.toggle("hidden", !matchesQuery);
      if (matchesQuery) visibleCount++;
    });

    if (noResults) {
      noResults.classList.toggle("visible", visibleCount === 0);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyProjectFilters);
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

  // --- Sidebar & Two-State Management (Fullscreen vs Small side bar) ---
  const sidebar = document.getElementById('sidebar');
  const sidebarHandle = document.getElementById('sidebar-handle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');

  const SLIVER_WIDTH = 34; // px visible on mobile in small sidebar state

  function isSmallScreen() {
    return window.innerWidth < 1024;
  }

  // Is currently in fullscreen mode
  let isFullscreen = false;

  function enterFullscreen() {
    isFullscreen = true;
    sidebar.classList.add('fullscreen', 'open');
    sidebar.style.transform = '';
    sidebarOverlay.classList.add('active');
    sidebarOverlay.style.opacity = '1';
    document.body.style.overflow = 'hidden';
    if (sidebarHandle) {
      sidebarHandle.setAttribute('title', 'Return to small side bar');
      sidebarHandle.setAttribute('aria-label', 'Return to small side bar');
    }
    window.dispatchEvent(new Event('resize'));
  }

  function exitFullscreen() {
    isFullscreen = false;
    sidebar.classList.remove('fullscreen', 'open');
    sidebar.style.transform = '';
    sidebarOverlay.classList.remove('active');
    sidebarOverlay.style.opacity = '';
    document.body.style.overflow = '';
    if (sidebarHandle) {
      sidebarHandle.setAttribute('title', 'Expand to fullscreen');
      sidebarHandle.setAttribute('aria-label', 'Expand to fullscreen');
    }
    window.dispatchEvent(new Event('resize'));
  }

  function toggleSidebarState() {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  // Handle click / tap on the sidebar edge handle
  let didSlide = false;

  if (sidebarHandle) {
    sidebarHandle.addEventListener('click', (e) => {
      // Prevent handling if a drag just ended
      if (didSlide) return;
      toggleSidebarState();
    });

    // Keyboard accessibility (Enter / Space)
    sidebarHandle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSidebarState();
      }
    });
  }

  // Close button always restores to small side bar
  if (sidebarClose) {
    sidebarClose.addEventListener('click', (e) => {
      e.stopPropagation();
      exitFullscreen();
    });
  }

  // Overlay click restores to small side bar
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      exitFullscreen();
    });
  }

  // Hamburger button toggles state
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      toggleSidebarState();
    });
  }

  // Nav links close fullscreen on small screen
  sidebar.querySelectorAll('.sidebar-nav a, .brand-name a, .brand-logo-link').forEach(link => {
    link.addEventListener('click', () => {
      if (isSmallScreen() && isFullscreen) {
        exitFullscreen();
      }
    });
  });

  // Escape key exits fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      exitFullscreen();
    }
  });

  // ============================================
  // Sliding Gesture Handler (Snaps strictly to Fullscreen or Small side bar)
  // ============================================
  let isPointerDown = false;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  function onSlideStart(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isPointerDown = true;
    didSlide = false;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    startY = e.clientY || (e.touches && e.touches[0].clientY);
    startTime = performance.now();

    try {
      sidebarHandle.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function onSlideMove(e) {
    if (!isPointerDown) return;

    const currentX = e.clientX || (e.touches && e.touches[0].clientX);
    const currentY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (!didSlide && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
      // Check if primary movement is horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        didSlide = true;
        sidebar.classList.add('sliding');
      }
    }

    if (!didSlide) return;

    // Mobile / small screen slide preview
    if (isSmallScreen()) {
      const maxOffset = window.innerWidth - SLIVER_WIDTH;
      let offset;
      if (!isFullscreen) {
        // Dragging right (positive deltaX) expands the left sidebar
        offset = -maxOffset + deltaX;
      } else {
        // Dragging left (negative deltaX) collapses the left sidebar
        offset = deltaX;
      }
      const clampedOffset = Math.min(0, Math.max(-maxOffset, offset));
      sidebar.style.transform = `translateX(${clampedOffset}px)`;

      const progress = (clampedOffset + maxOffset) / maxOffset;
      sidebarOverlay.classList.add('active');
      sidebarOverlay.style.opacity = Math.max(0, Math.min(1, progress)).toString();
    }
  }

  function onSlideEnd(e) {
    if (!isPointerDown) return;
    isPointerDown = false;

    const currentX = (e.clientX !== undefined) ? e.clientX : ((e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX);
    const deltaX = currentX - startX;

    sidebar.classList.remove('sliding');

    try {
      sidebarHandle.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (didSlide) {
      // Was a slide gesture: decide snap target
      if (!isFullscreen) {
        // From small sidebar: user dragged rightwards
        if (deltaX > 45) {
          enterFullscreen();
        } else {
          exitFullscreen();
        }
      } else {
        // From fullscreen: user dragged leftwards
        if (deltaX < -45) {
          exitFullscreen();
        } else {
          enterFullscreen();
        }
      }
      // Reset didSlide flag after brief delay so click doesn't re-toggle
      setTimeout(() => { didSlide = false; }, 60);
    }
  }

  if (sidebarHandle) {
    sidebarHandle.addEventListener('pointerdown', onSlideStart);
    sidebarHandle.addEventListener('pointermove', onSlideMove);
    sidebarHandle.addEventListener('pointerup', onSlideEnd);
    sidebarHandle.addEventListener('pointercancel', onSlideEnd);
  }

  // Swipe inside sidebar when in fullscreen on mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  sidebar.addEventListener('touchstart', (e) => {
    if (!isFullscreen) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
  }, { passive: true });

  sidebar.addEventListener('touchmove', (e) => {
    if (!isFullscreen) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;

    if (!isSwiping && deltaX < -15 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      isSwiping = true;
      sidebar.classList.add('sliding');
    }

    if (isSwiping && deltaX < 0) {
      const maxOffset = window.innerWidth - SLIVER_WIDTH;
      const clampedOffset = Math.max(-maxOffset, deltaX);
      sidebar.style.transform = `translateX(${clampedOffset}px)`;
      const progress = (clampedOffset + maxOffset) / maxOffset;
      sidebarOverlay.style.opacity = Math.max(0, progress).toString();
    }
  }, { passive: true });

  sidebar.addEventListener('touchend', (e) => {
    if (!isFullscreen || !isSwiping) return;
    sidebar.classList.remove('sliding');
    isSwiping = false;
    const deltaX = e.changedTouches[0].clientX - touchStartX;

    // Swiping left in fullscreen collapses back to small sidebar
    if (deltaX < -50) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, { passive: true });

  // Handle window resizing
  window.addEventListener('resize', () => {
    if (!isSmallScreen() && !isFullscreen) {
      sidebar.style.transform = '';
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});
