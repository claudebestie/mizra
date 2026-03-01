/* ===========================
   MIZRA — Shared JavaScript
   =========================== */

// ===========================
// LANGUAGE TOGGLE
// ===========================
function initLanguageToggle() {
    const langBtns = document.querySelectorAll('.lang-btn');

    langBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.dataset.lang;
            if (lang === 'en') {
                window.location.href = '/en/';
            } else {
                window.location.href = '/';
            }
        });
    });
}

// ===========================
// MOBILE MENU
// ===========================
function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const navCenter = document.querySelector('.nav-center');

    if (toggle && navCenter) {
        toggle.addEventListener('click', function() {
            navCenter.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Dropdown on mobile
    const dropdowns = document.querySelectorAll('.nav-dropdown > a');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function(e) {
            if (window.innerWidth <= 968) {
                e.preventDefault();
                this.parentElement.classList.toggle('active');
            }
        });
    });

    // Close menu on link click
    document.querySelectorAll('.nav-links a:not(.nav-dropdown > a)').forEach(link => {
        link.addEventListener('click', () => {
            if (navCenter) navCenter.classList.remove('active');
            if (toggle) toggle.classList.remove('active');
        });
    });
}

// ===========================
// SMOOTH SCROLL
// ===========================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ===========================
// ROI CALCULATOR
// ===========================
function initROICalculator() {
    const customersInput = document.getElementById('newCustomers');
    const spendInput = document.getElementById('avgSpend');

    function calculate() {
        const customers = parseInt(customersInput?.value) || 0;
        const spend = parseInt(spendInput?.value) || 0;
        const monthlyRevenue = customers * spend;
        const investment = 4990;
        const payback = monthlyRevenue > 0 ? Math.ceil(investment / monthlyRevenue) : 0;

        const resultEl = document.getElementById('roiResult');
        const monthsEl = document.getElementById('paybackMonths');
        if (resultEl) resultEl.textContent = '\u20AA' + monthlyRevenue.toLocaleString();
        if (monthsEl) monthsEl.textContent = payback;
    }

    if (customersInput) customersInput.addEventListener('input', calculate);
    if (spendInput) spendInput.addEventListener('input', calculate);

    calculate();
}

// ===========================
// FAQ ACCORDION
// ===========================
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', function() {
            const item = this.parentElement;
            const isActive = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

            // Open clicked if wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ===========================
// CONTACT / AUDIT FORMS (Formspree)
// ===========================
function initForms() {
    document.querySelectorAll('form[data-formspree]').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.textContent = '...';
                submitBtn.disabled = true;
            }

            try {
                const formData = new FormData(this);
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    this.reset();
                    if (submitBtn) submitBtn.textContent = '\u2713';
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.textContent = originalText;
                            submitBtn.disabled = false;
                        }
                    }, 3000);
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (err) {
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    });
}

// ===========================
// SCROLL ANIMATIONS
// ===========================
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section-header, .problem-card, .pricing-card, .case-card, .process-step, .vertical-card, .feature-card, .blog-card, .portfolio-card').forEach(el => {
        observer.observe(el);
    });
}

// ===========================
// HEADER SCROLL EFFECT
// ===========================
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
        } else {
            header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
        }
        lastScroll = currentScroll;
    });
}

// ===========================
// INIT ALL
// ===========================
document.addEventListener('DOMContentLoaded', function() {
    initLanguageToggle();
    initMobileMenu();
    initSmoothScroll();
    initROICalculator();
    initFAQ();
    initForms();
    initScrollAnimations();
    initHeaderScroll();
});
