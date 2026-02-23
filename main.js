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

  /* ── 8. LOTTIE HERO ANIMATION ──────────────────────────── */
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
  }

});
