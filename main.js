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

  /* ── 5. DOWNLOAD BUTTONS (placeholder) ───────────────── */
  document.querySelectorAll('.btn-download').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Assets coming soon! 🚀');
    });
  });

  document.querySelectorAll('.btn[data-action="download-kit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Branding Kit coming soon! 🎨');
    });
  });

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
