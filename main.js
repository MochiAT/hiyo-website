/* ============================================================
   HI-YO MEMECOIN — main.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. NAVBAR: Hamburger toggle ──────────────────────── */
  const hamburger = document.querySelector('.navbar__hamburger');
  const navLinks = document.querySelector('.navbar__links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });

    // Close nav on link click (mobile)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  /* ── 1c. BUY NOW MODAL ─────────────────────────────────── */
  const buyModal = document.getElementById('buy-modal');
  const modalClose = document.getElementById('modal-close');

  function openModal() {
    buyModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    buyModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // All .navbar__buy links trigger the modal instead of scrolling
  document.querySelectorAll('.navbar__buy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Close mobile menu if open
      navLinks && navLinks.classList.remove('open');
      openModal();
    });
  });

  modalClose && modalClose.addEventListener('click', closeModal);

  // Close on backdrop click
  buyModal && buyModal.addEventListener('click', (e) => {
    if (e.target === buyModal) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ── 1b. TWEET CAROUSEL: infinite loop by cloning cards ── */
  const carousel = document.getElementById('tweet-carousel');
  if (carousel) {
    const cards = Array.from(carousel.children);
    cards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      carousel.appendChild(clone);
    });

    // Mobile tap interaction: 1st tap = pause + press, 2nd tap = resume + unpress
    let activeCard = null;

    carousel.addEventListener('touchend', (e) => {
      // If user tapped "Read full post", let the link navigate normally
      if (e.target.closest('.tweet-read-more')) return;

      const card = e.target.closest('.tweet-card');
      if (!card) return;

      e.preventDefault();

      if (activeCard === card) {
        // 2nd tap on same card → resume carousel, remove press effect
        card.classList.remove('tweet-card--pressed');
        carousel.classList.remove('tweet-carousel--paused');
        activeCard = null;
      } else {
        // 1st tap (or tap on a different card) → pause, apply press
        if (activeCard) {
          activeCard.classList.remove('tweet-card--pressed');
        }
        card.classList.add('tweet-card--pressed');
        carousel.classList.add('tweet-carousel--paused');
        activeCard = card;
      }
    }, { passive: false });
  }

  /* ── 2. NAVBAR: Scroll shrink / shadow ────────────────── */
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('navbar--scrolled', window.scrollY > 20);
  });

  /* ── 3. COPY CONTRACT ADDRESS ─────────────────────────── */
  const copyBtn = document.getElementById('copy-btn');
  const caValue = document.getElementById('ca-value');

  if (copyBtn && caValue) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(caValue.textContent.trim());
        showToast('Address copied! 🐎');
        copyBtn.classList.add('copied');
        setTimeout(() => copyBtn.classList.remove('copied'), 1500);
      } catch {
        // Fallback for non-HTTPS
        const range = document.createRange();
        range.selectNode(caValue);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        showToast('Address copied!');
      }
    });
  }

  /* ── 4. TOAST NOTIFICATION ────────────────────────────── */
  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  /* ── 5. DOWNLOADS ────────────────────────────────────── */
  const dlKit = document.getElementById('dl-kit');
  if (dlKit) {
    dlKit.addEventListener('click', () => {
      showToast('Downloading resources... 🐎');
    });
  }

  // Banners: real links vs placeholders
  document.querySelectorAll('.btn-dl').forEach(el => {
    el.addEventListener('click', (e) => {
      if (el.tagName === 'A') {
        showToast('Downloading banner... 🐎');
      } else {
        showToast('Banners coming soon! 🚀');
      }
    });
  });

  /* ── 5b. TOKENOMICS INTERACTIVITY ─────────────────────── */
  const tokRows = document.querySelectorAll('.tok-row');
  const tokSvg = document.querySelector('.tok__donut-svg');
  const tokCircles = tokSvg ? tokSvg.querySelectorAll('circle') : [];

  if (tokRows.length && tokSvg) {
    const resetAll = () => {
      tokRows.forEach(r => r.classList.remove('active'));
      tokCircles.forEach(c => c.classList.remove('active'));
      tokSvg.classList.remove('has-active');
    };

    const activateId = (id) => {
      const row = document.querySelector(`.tok-row[data-tok-id="${id}"]`);
      const circle = tokSvg.querySelector(`circle[data-tok-id="${id}"]`);

      if (row && circle) {
        const isAlreadyActive = row.classList.contains('active');
        resetAll();
        if (!isAlreadyActive) {
          row.classList.add('active');
          circle.classList.add('active');
          tokSvg.classList.add('has-active');
        }
      }
    };

    tokRows.forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        activateId(row.getAttribute('data-tok-id'));
      });
    });

    tokCircles.forEach(circle => {
      circle.addEventListener('click', (e) => {
        e.stopPropagation();
        activateId(circle.getAttribute('data-tok-id'));
      });
    });

    // Reset when clicking outside the tok__grid
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tok__grid')) {
        resetAll();
      }
    });
  }

  /* ── 6. SCROLL REVEAL (lightweight, no deps) ─────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: just show everything
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  /* ── 7. SMOOTH SCROLL for anchor links ───────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // navbar height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── 8. LOTTIE HERO ANIMATION & FIREWORKS ──────────────────────────── */
  const lottieContainer = document.getElementById('lottie-logo');
  if (lottieContainer) {
    const heroAnimation = lottie.loadAnimation({
      container: lottieContainer,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: 'assets/HiYo Hero.json'
    });

    // Play once on hover. Mouseout and re-hover to play again.
    lottieContainer.addEventListener('mouseenter', () => {
      heroAnimation.goToAndPlay(0, true);
    });

    // Setup fireworks canvas & text overlay
    const heroSection = document.getElementById('hero');
    const fwCanvas = document.createElement('canvas');
    fwCanvas.style.position = 'absolute';
    fwCanvas.style.top = '0';
    fwCanvas.style.left = '0';
    fwCanvas.style.width = '100%';
    fwCanvas.style.height = '100%';
    fwCanvas.style.pointerEvents = 'none';
    fwCanvas.style.zIndex = '0'; // Behind the logo
    heroSection.appendChild(fwCanvas);

    const ctx = fwCanvas.getContext('2d');
    function resizeCanvas() {
      fwCanvas.width = heroSection.clientWidth;
      fwCanvas.height = heroSection.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const particles = [];
    let animId = null;
    let fadingOut = false;

    // CSS transition on the canvas for a guaranteed linear fade-out
    fwCanvas.style.transition = 'opacity 1.2s linear';

    function fireworkExplosion(x, y) {
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 3;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: Math.random() * 0.006 + 0.003,
          size: Math.random() * 3 + 2,
          color: `hsl(${Math.random() * 50 + 10}, 100%, 60%)`
        });
      }
    }

    function loopFireworks() {
      // Clean clear each frame — no more exponential destination-out decay
      ctx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= p.decay;

        // Each particle has its own linear opacity from life (1 → 0)
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) particles.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      if (particles.length > 0) {
        animId = requestAnimationFrame(loopFireworks);
      } else if (!fadingOut) {
        // All particles are gone — trigger CSS linear fade-out on the whole canvas
        fadingOut = true;
        fwCanvas.style.opacity = '0';

        // After the CSS transition completes, hard-reset the canvas
        setTimeout(() => {
          fwCanvas.style.transition = 'none';
          fwCanvas.style.opacity = '1';
          ctx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
          // Re-enable transition for next trigger
          requestAnimationFrame(() => {
            fwCanvas.style.transition = 'opacity 1.2s linear';
            fadingOut = false;
            animId = null;
          });
        }, 1200); // match transition duration
      }
    }

    // Overlay text
    const textDiv = document.createElement('div');
    textDiv.textContent = 'Year of the fire horse';
    textDiv.classList.add('firehorse-text');
    lottieContainer.appendChild(textDiv);

    let isExploding = false;

    lottieContainer.addEventListener('click', () => {
      // prevent spam clicks
      if (isExploding) return;
      isExploding = true;

      const rect = lottieContainer.getBoundingClientRect();
      const heroRect = heroSection.getBoundingClientRect();
      const centerX = rect.left - heroRect.left + rect.width / 2;
      const centerY = rect.top - heroRect.top + rect.height / 2;

      // 6 vivid explosions behind the logo scattered over a wider area
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const offsetX = (Math.random() - 0.5) * 350;
          const offsetY = (Math.random() - 0.5) * 250;
          fireworkExplosion(centerX + offsetX, centerY + offsetY);
          if (!animId) loopFireworks();
        }, i * 180 + Math.random() * 100); // Staggered but slightly random
      }

      // Show text as the fireworks explode
      setTimeout(() => {
        textDiv.style.opacity = '';        // clear any inline style from previous run
        textDiv.style.transition = '';
        textDiv.style.animation = '';
        textDiv.classList.add('show');
      }, 300);

      // Fade text out linearly (same pattern as canvas) — stop flicker, then smoothly go to 0
      setTimeout(() => {
        textDiv.style.animation = 'none';  // freeze flicker at current opacity
        textDiv.style.transition = 'opacity 1.5s linear';
        textDiv.style.opacity = '0';

        // After CSS transition completes, clean up
        setTimeout(() => {
          textDiv.classList.remove('show');
          textDiv.style.animation = '';
          textDiv.style.transition = '';
          textDiv.style.opacity = '';
          isExploding = false;
        }, 1500);
      }, 2000);
    });
  }

  /* ── 9. MOBILE BANNERS CAROUSEL — dots sync + autoplay ──── */
  const bannersGrid = document.getElementById('banners-grid');
  const dotsWrap = document.getElementById('banner-dots');

  if (bannersGrid && dotsWrap) {
    const cards = bannersGrid.querySelectorAll('.banner-card');
    let currentIndex = 0;
    let autoplayTimer = null;

    // Build dot indicators
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'banners-carousel__dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Banner ${i + 1}`);
      dot.addEventListener('click', () => {
        goToCard(i);
        resetAutoplay();
      });
      dotsWrap.appendChild(dot);
    });

    const dots = dotsWrap.querySelectorAll('.banners-carousel__dot');

    function goToCard(index) {
      if (index < 0 || index >= cards.length) return;
      bannersGrid.scrollTo({
        left: bannersGrid.clientWidth * index,
        behavior: 'smooth'
      });
    }

    function updateDots() {
      const gridLeft = bannersGrid.scrollLeft;
      let closest = 0;
      let minDist = Infinity;

      cards.forEach((card, i) => {
        const dist = Math.abs(card.offsetLeft - gridLeft);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });

      currentIndex = closest;
      dots.forEach((d, i) => d.classList.toggle('active', i === closest));
    }

    // Sync dots on scroll
    let scrollTimeout;
    bannersGrid.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateDots, 60);
    }, { passive: true });

    // Reset autoplay on manual interaction
    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    // User touch resets timer
    bannersGrid.addEventListener('touchstart', () => {
      clearInterval(autoplayTimer);
    }, { passive: true });

    bannersGrid.addEventListener('touchend', () => {
      resetAutoplay();
    }, { passive: true });

    // Autoplay: advance every 5s, loop back to start
    function startAutoplay() {
      autoplayTimer = setInterval(() => {
        const nextIndex = (currentIndex + 1) % cards.length;
        goToCard(nextIndex);
      }, 5000);
    }

    // Only start autoplay on mobile
    const mql = window.matchMedia('(max-width: 768px)');
    if (mql.matches) startAutoplay();
    mql.addEventListener('change', (e) => {
      if (e.matches) startAutoplay();
      else clearInterval(autoplayTimer);
    });
  }

  /* ── 10. BANNER LIGHTBOX ─────────────────────────────────── */
  const lightbox      = document.getElementById('banner-lightbox');
  const lbImg         = document.getElementById('lightbox-img');
  const lbTitle       = document.getElementById('lightbox-title');
  const lbClose       = document.getElementById('lightbox-close');
  const lbPrev        = document.getElementById('lightbox-prev');
  const lbNext        = document.getElementById('lightbox-next');

  if (lightbox && lbImg) {
    // Collect all banner thumbs
    const bannerThumbs = Array.from(document.querySelectorAll('.banner-thumb'));
    let lbIndex = 0;

    function lbOpen(index) {
      lbIndex = index;
      const thumb = bannerThumbs[lbIndex];
      const img   = thumb.querySelector('img');
      const title = thumb.closest('.banner-card')?.querySelector('.banner-card__title');
      lbImg.src   = img.src;
      lbImg.alt   = img.alt;
      lbTitle.textContent = title ? title.textContent : '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function lbClose_fn() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function lbGoTo(index) {
      lbIndex = (index + bannerThumbs.length) % bannerThumbs.length;
      lbOpen(lbIndex);
    }

    // Click on any thumbnail opens lightbox
    bannerThumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => lbOpen(i));
    });

    // Controls
    lbClose.addEventListener('click', lbClose_fn);
    lbPrev.addEventListener('click', () => lbGoTo(lbIndex - 1));
    lbNext.addEventListener('click', () => lbGoTo(lbIndex + 1));

    // Mobile bottom nav buttons
    const lbPrevMob = document.getElementById('lightbox-prev-mob');
    const lbNextMob = document.getElementById('lightbox-next-mob');
    if (lbPrevMob) lbPrevMob.addEventListener('click', () => lbGoTo(lbIndex - 1));
    if (lbNextMob) lbNextMob.addEventListener('click', () => lbGoTo(lbIndex + 1));

    // Click on backdrop (not content) closes
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lbClose_fn();
    });

    // Keyboard: Escape closes, arrows navigate
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape')      lbClose_fn();
      if (e.key === 'ArrowLeft')   lbGoTo(lbIndex - 1);
      if (e.key === 'ArrowRight')  lbGoTo(lbIndex + 1);
    });
  }

});
