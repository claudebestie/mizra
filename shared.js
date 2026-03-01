// ============================================================
// MIZRA - Shared Components (nav, footer, language, mobile menu)
// Include on every page: <script src="/shared.js"></script>
// ============================================================

// --- NAVIGATION ---
function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
<a href="/" class="nav-logo">mizra<span>.</span></a>
<button class="menu-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
<div class="nm">
  <div class="en">
    <div class="nd"><span class="nd-label">Services</span>
      <div class="nd-drop">
        <a href="/services/restaurants/"><strong>Restaurants</strong><small>See example</small></a>
        <a href="/services/cafes/"><strong>Cafes</strong><small>See example</small></a>
        <a href="/services/beauty-salons/"><strong>Beauty Salons</strong><small>See example</small></a>
        <a href="/services/barbershops/"><strong>Barbershops</strong><small>See example</small></a>
        <a href="/services/clinics/"><strong>Clinics</strong><small>See example</small></a>
        <a href="/services/lawyers/"><strong>Lawyers</strong><small>See example</small></a>
        <a href="/services/contractors/"><strong>Contractors</strong><small>See example</small></a>
      </div>
    </div>
    <a href="/#examples">Examples</a><a href="/pricing/">Pricing</a><a href="/blog/">Blog</a>
  </div>
  <div class="he">
    <div class="nd"><span class="nd-label">שירותים</span>
      <div class="nd-drop">
        <a href="/services/restaurants/"><strong>מסעדות</strong><small>ראו דוגמה</small></a>
        <a href="/services/cafes/"><strong>בתי קפה</strong><small>ראו דוגמה</small></a>
        <a href="/services/beauty-salons/"><strong>מכוני יופי</strong><small>ראו דוגמה</small></a>
        <a href="/services/barbershops/"><strong>מספרות</strong><small>ראו דוגמה</small></a>
        <a href="/services/clinics/"><strong>קליניקות</strong><small>ראו דוגמה</small></a>
        <a href="/services/lawyers/"><strong>עורכי דין</strong><small>ראו דוגמה</small></a>
        <a href="/services/contractors/"><strong>קבלנים</strong><small>ראו דוגמה</small></a>
      </div>
    </div>
    <a href="/#examples">דוגמאות</a><a href="/pricing/">מחירון</a><a href="/blog/">בלוג</a>
  </div>
</div>
<div class="nr">
  <div class="ls"><button onclick="setL('en')">EN</button><button class="on" onclick="setL('he')">HE</button></div>
  <a href="/free-audit/" class="btn btn-p btn-sm"><span class="en">Get Started</span><span class="he">בואו נתחיל</span></a>
</div>`;
  document.body.prepend(nav);
  const toggle = nav.querySelector('.menu-toggle');
  const nm = nav.querySelector('.nm');
  toggle.addEventListener('click', function() {
    this.classList.toggle('open');
    nm.classList.toggle('open');
    document.body.style.overflow = nm.classList.contains('open') ? 'hidden' : '';
  });
  // Auto-close menu on link click
  nm.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      toggle.classList.remove('open');
      nm.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// --- FOOTER ---
function renderFooter() {
  const footer = document.createElement('footer');
  footer.innerHTML = `
<div>
  <p style="font-family:var(--sf);font-size:1.15rem;color:var(--or);margin-bottom:3px;font-weight:600">mizra<span style="color:#fff">.</span></p>
  <div class="en"><p>Professional websites for small businesses. Tel Aviv.</p></div>
  <div class="he"><p>אתרים מקצועיים לעסקים קטנים. תל אביב.</p></div>
</div>
<div class="footer-links">
  <div class="en"><a href="/services/restaurants/">Restaurants</a> · <a href="/services/cafes/">Cafés</a> · <a href="/services/beauty-salons/">Salons</a> · <a href="/services/barbershops/">Barbers</a> · <a href="/services/clinics/">Clinics</a> · <a href="/services/lawyers/">Lawyers</a> · <a href="/services/contractors/">Contractors</a></div>
  <div class="he"><a href="/services/restaurants/">מסעדות</a> · <a href="/services/cafes/">בתי קפה</a> · <a href="/services/beauty-salons/">מכוני יופי</a> · <a href="/services/barbershops/">מספרות</a> · <a href="/services/clinics/">קליניקות</a> · <a href="/services/lawyers/">עורכי דין</a> · <a href="/services/contractors/">קבלנים</a></div>
</div>
<p>&copy; 2026 Mizra. hello@getmizra.com</p>`;
  document.body.appendChild(footer);
}

// --- WHATSAPP BUTTON ---
function renderWhatsApp() {
  const wa = document.createElement('a');
  wa.href = 'https://wa.me/972542271670';
  wa.className = 'wa';
  wa.target = '_blank';
  wa.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  document.body.appendChild(wa);
}

// --- LANGUAGE TOGGLE ---
function setL(l) {
  document.body.classList.toggle('lh', l === 'he');
  document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = l === 'he' ? 'he' : 'en';
  document.querySelectorAll('.ls button').forEach(b => b.classList.remove('on'));
  if (event && event.target) event.target.classList.add('on');
  try { localStorage.setItem('mizra_lang', l); } catch(e) {}
}

// --- SCROLL REVEAL ---
function initScrollReveal() {
  const ob = new IntersectionObserver(e => {
    e.forEach(x => { if (x.isIntersecting) x.target.classList.add('vis'); });
  }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(el => ob.observe(el));
}

// --- FAQ ACCORDION ---
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
  });
}

// --- SMOOTH SCROLL ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const t = document.querySelector(this.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('[data-shared]')) {
    renderNav();
    renderFooter();
    renderWhatsApp();
  }
  // Restore language
  try {
    const saved = localStorage.getItem('mizra_lang');
    if (saved === 'en') {
      document.body.classList.remove('lh');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      setTimeout(() => {
        document.querySelectorAll('.ls button').forEach(b => {
          b.classList.toggle('on', b.textContent.trim() === 'EN');
        });
      }, 50);
    }
  } catch(e) {}
  initScrollReveal();
  initFAQ();
  initSmoothScroll();
});
