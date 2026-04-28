// ============================================
// EQUIVA — APPLICATION SHELL
// Vanilla JS. No frameworks.
// ============================================

(function() {
    'use strict';

    // ============================================
    // COLOR TOKENS — mirrors :root in styles.css
    // Keep this in sync when styles.css tokens change.
    // ============================================

    var C = {
        greenCore:     '#5cb810',
        greenLight:    '#45cb0b',
        greenMuted:    '#7fd14e',
        greenMidDark:  '#399639',
        greenDeep:     '#2d7a2d',
        greenDarkest:  '#1e521e',
        greenTint100:  '#f4fbf0',
        greenTint200:  '#eaf6df',
        greenTint300:  '#ddf0cc',
        goldPrimary:   '#fcb212',
        goldAmber:     '#fa741e',
        goldDark:      '#d95e0e',
        goldWarmBg:    '#fef5e9',
        textPrimary:   '#252117',
        textNavy:      '#3e55b3',
        textDark:      '#1A1A1A',
        textCharcoal:  '#212B36',
        greyBody:      '#5E5E5E',
        greyMuted:     '#9CA3AF',
        greyDisabled:  '#C8C8C8',
        borderStandard:'#F4F4F4',
        borderLight:   '#EDEEEF',
        bgWhite:       '#FFFDF9',
        bgOffwhite:    '#F8F5EF',
        bgLight:       '#F3F0E9',
        bgCard:        '#F6F7F7',
        statusError:   '#E22034',
        statusSuccess: '#07BC0C'
    };

    // ============================================
    // DOM HELPER — el(tag, attrs, children)
    // Always use this. Never raw createElement chains.
    // ============================================

    function el(tag, attrs, children) {
        var elem = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(key) {
                if (key === 'className') elem.className = attrs[key];
                else if (key === 'textContent') elem.textContent = attrs[key];
                else if (key === 'innerHTML') elem.innerHTML = attrs[key];
                else if (key.startsWith('on')) {
                    elem.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
                } else {
                    elem.setAttribute(key, attrs[key]);
                }
            });
        }
        if (children !== undefined) {
            if (typeof children === 'string') {
                elem.textContent = children;
            } else if (Array.isArray(children)) {
                children.forEach(function(child) {
                    if (typeof child === 'string') {
                        elem.appendChild(document.createTextNode(child));
                    } else {
                        elem.appendChild(child);
                    }
                });
            }
        }
        return elem;
    }

    // ============================================
    // ANIMATION MODULE
    // All motion goes through here.
    // ============================================

    var Anim = {
        enabled: true,

        init: function() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.enabled = false;
                gsap.globalTimeline.timeScale(20);
            }
            gsap.registerPlugin(ScrollTrigger);
            gsap.defaults({
                ease: 'power3.out',
                duration: 0.6
            });
        },

        // ---- Page-entry orchestration ----
        // Scans container for .anim-card, .chart-wrap, .service-card, etc.
        // All non-home pages call this in their init().
        animatePage: function(container) {
            if (!this.enabled) return;

            // Hero entrance (generic — for .about-page-header pages)
            var heroBadge = container.querySelector('.about-page-header .section-badge');
            var heroTitle = container.querySelector('.about-page-title');
            var heroSubtitle = container.querySelector('.about-page-subtitle');
            if (heroBadge || heroTitle || heroSubtitle) {
                var tl = gsap.timeline();
                if (heroBadge) tl.fromTo(heroBadge,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5 }
                );
                if (heroTitle) tl.fromTo(heroTitle,
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(1.4)' },
                    '-=0.3'
                );
                if (heroSubtitle) tl.fromTo(heroSubtitle,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5 },
                    '-=0.4'
                );
            }

            // Service cards reveal (scroll-triggered)
            var serviceCards = container.querySelectorAll('.service-card');
            if (serviceCards.length) {
                ScrollTrigger.batch(serviceCards, {
                    onEnter: function(batch) {
                        gsap.fromTo(batch,
                            { opacity: 0, y: 40 },
                            { opacity: 1, y: 0, stagger: 0.12, duration: 0.6,
                              ease: 'back.out(1.4)' }
                        );
                    },
                    start: 'top 85%',
                    once: true
                });
            }

            // Insight cards reveal (scroll-triggered)
            var insightCards = container.querySelectorAll('.insight-card');
            if (insightCards.length) {
                ScrollTrigger.batch(insightCards, {
                    onEnter: function(batch) {
                        gsap.fromTo(batch,
                            { opacity: 0, x: -30 },
                            { opacity: 1, x: 0, stagger: 0.1, duration: 0.6,
                              ease: 'power3.out' }
                        );
                    },
                    start: 'top 85%',
                    once: true
                });
            }

            // Above-fold card reveal (back.out bounce)
            var aboveCards = container.querySelectorAll('.anim-card');
            if (aboveCards.length) {
                gsap.fromTo(aboveCards,
                    { opacity: 0, y: 30, scale: 0.97 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.6,
                      ease: 'back.out(1.7)', stagger: { amount: 0.5, from: 'start' } }
                );
            }

            // Below-fold card reveal (scroll-triggered)
            ScrollTrigger.batch(container.querySelectorAll('.anim-card-below'), {
                onEnter: function(batch) {
                    gsap.to(batch, { opacity: 1, y: 0, duration: 0.6,
                        ease: 'back.out(1.4)', stagger: 0.08 });
                },
                start: 'top 88%',
                once: true
            });

            // Chart curtain reveal
            var chartWraps = container.querySelectorAll('.chart-wrap, .chart-wrap-hbar, .chart-wrap-doughnut');
            chartWraps.forEach(function(wrap) {
                if (!wrap._gsapCurtain) {
                    wrap._gsapCurtain = true;
                    ScrollTrigger.create({
                        trigger: wrap,
                        start: 'top 85%',
                        once: true,
                        onEnter: function() {
                            gsap.fromTo(wrap,
                                { clipPath: 'inset(0 100% 0 0)' },
                                { clipPath: 'inset(0 0% 0 0)', duration: 0.8,
                                  ease: 'power3.inOut' }
                            );
                        }
                    });
                }
            });

            // Parallax depth on chart cards (alternating odd/even)
            var chartCards = container.querySelectorAll('.chart-card');
            chartCards.forEach(function(card, i) {
                ScrollTrigger.create({
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.5,
                    onUpdate: function(self) {
                        var offset = i % 2 === 0 ? -10 : -18;
                        gsap.set(card, { y: offset * (1 - self.progress * 2) });
                    }
                });
            });
        },

        // ---- Number count-up ----
        // Selector: .stat-card-value, .pulse-value, .overview-stat-value
        animateCountUp: function(container) {
            if (!this.enabled) return;
            var targets = container.querySelectorAll('.stat-card-value, .pulse-value, .overview-stat-value');
            gsap.fromTo(targets,
                { textContent: 0 },
                {
                    textContent: function() { return this.getAttribute('data-value') || this.textContent; },
                    duration: 1.2,
                    ease: 'power2.out',
                    delay: 0.35,
                    snap: { textContent: 0.1 },
                    stagger: 0.08
                }
            );
        },

        // ---- Ambient breathing ----
        // Use _gsapBreathing / _gsapDrift sentinels to prevent stacking.
        startAmbient: function() {
            if (!this.enabled) return;

            // Badge dot pulse
            var badgeDot = document.querySelector('.badge-dot');
            if (badgeDot && !badgeDot._gsapBreathing) {
                badgeDot._gsapBreathing = true;
                gsap.to(badgeDot, {
                    scale: 1.1,
                    opacity: 0.6,
                    duration: 1,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });
            }

            // Pulse dot breathing
            var dot = document.querySelector('.pulse-dot');
            if (dot && !dot._gsapBreathing) {
                dot._gsapBreathing = true;
                gsap.to(dot, {
                    scale: 1.4,
                    opacity: 0.5,
                    duration: 1.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });
            }

            // Glow orbs drift (hero glows)
            var glow1 = document.querySelector('.hero-glow-1');
            var glow2 = document.querySelector('.hero-glow-2');
            if (glow1 && !glow1._gsapDrift) {
                glow1._gsapDrift = true;
                gsap.to(glow1, { x: 30, y: -20, duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            }
            if (glow2 && !glow2._gsapDrift) {
                glow2._gsapDrift = true;
                gsap.to(glow2, { x: -30, y: 20, duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            }

            // Visual accent rotation
            var accent = document.querySelector('.visual-accent');
            if (accent && !accent._gsapDrift) {
                accent._gsapDrift = true;
                gsap.to(accent, { rotation: 360, duration: 30, repeat: -1, ease: 'none' });
            }

            // Waitlist glows
            var wglow1 = document.querySelector('.waitlist-glow-1');
            var wglow2 = document.querySelector('.waitlist-glow-2');
            if (wglow1 && !wglow1._gsapDrift) {
                wglow1._gsapDrift = true;
                gsap.to(wglow1, { x: 20, y: -10, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            }
            if (wglow2 && !wglow2._gsapDrift) {
                wglow2._gsapDrift = true;
                gsap.to(wglow2, { x: -20, y: 10, duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
            }
        },

        // ---- Tab underline slide (Analytics page) ----
        slideTabUnderline: function(newTab) {
            if (!this.enabled) return;
            var bar = newTab.closest('.analytics-tab-bar');
            var active = bar.querySelector('.analytics-tab.active');
            var floating = el('div', { className: 'tab-underline-float' });
            if (active) {
                var oldRect = active.getBoundingClientRect();
                var barRect = bar.getBoundingClientRect();
                floating.style.left = (oldRect.left - barRect.left) + 'px';
                floating.style.bottom = '0';
                floating.style.width = oldRect.width + 'px';
                bar.style.position = 'relative';
                bar.appendChild(floating);
            }
            var newRect = newTab.getBoundingClientRect();
            barRect = bar.getBoundingClientRect();
            gsap.to(floating, {
                left: newRect.left - barRect.left,
                width: newRect.width,
                duration: 0.35,
                ease: 'power3.inOut',
                onComplete: function() {
                    if (active) active.classList.remove('active');
                    newTab.classList.add('active');
                    floating.remove();
                }
            });
        },

        // ---- Cleanup ----
        killScrollTriggers: function() {
            ScrollTrigger.getAll().forEach(function(st) { st.kill(); });
        }
    };

    // ============================================
    // PAGE MODULES
    // Each page has: init(data), teardown()
    // ============================================

    var pageHome = {
        init: function() {
            // Hero entrance animation
            if (Anim.enabled) {
                var tl = gsap.timeline();
                tl.fromTo('.hero-badge',
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5 }
                )
                .fromTo('.hero-title',
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'back.out(1.4)' },
                    '-=0.3'
                )
                .fromTo('.hero-description',
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5 },
                    '-=0.4'
                )
                .fromTo('.hero-actions',
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5 },
                    '-=0.3'
                )
                .fromTo('.hero-stat',
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 },
                    '-=0.2'
                )
                .fromTo('.visual-card',
                    { opacity: 0, scale: 0.8, rotation: -5 },
                    { opacity: 1, scale: 1, rotation: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.2)' },
                    '-=0.5'
                );
            }

            // Scroll-triggered reveals
            if (Anim.enabled) {
                // Service cards
                ScrollTrigger.batch('.service-card', {
                    onEnter: function(batch) {
                        gsap.fromTo(batch,
                            { opacity: 0, y: 40 },
                            { opacity: 1, y: 0, stagger: 0.12, duration: 0.6, ease: 'back.out(1.4)' }
                        );
                    },
                    start: 'top 85%',
                    once: true
                });

                // Insight cards
                ScrollTrigger.batch('.insight-card', {
                    onEnter: function(batch) {
                        gsap.fromTo(batch,
                            { opacity: 0, x: -30 },
                            { opacity: 1, x: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
                        );
                    },
                    start: 'top 85%',
                    once: true
                });

                // About content
                ScrollTrigger.batch(['.about-text', '.value-item'], {
                    onEnter: function(batch) {
                        gsap.fromTo(batch,
                            { opacity: 0, y: 30 },
                            { opacity: 1, y: 0, stagger: 0.15, duration: 0.5, ease: 'power2.out' }
                        );
                    },
                    start: 'top 80%',
                    once: true
                });

                // Visual quote parallax
                gsap.fromTo('.visual-quote',
                    { y: 30 },
                    {
                        y: -30,
                        scrollTrigger: {
                            trigger: '.about-section',
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 0.5
                        }
                    }
                );

                // Waitlist card reveal
                ScrollTrigger.create({
                    trigger: '.waitlist-card',
                    start: 'top 85%',
                    once: true,
                    onEnter: function() {
                        gsap.fromTo('.waitlist-card',
                            { opacity: 0, y: 50, scale: 0.95 },
                            { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' }
                        );
                    }
                });
            }

            // Ambient animations
            Anim.startAmbient();

            // Page-specific behaviors
            initNavigation();
            initSubscribeForm();
        },

        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    // ============================================
    // PAGE REGISTRY
    // Add new pages here as they're built.
    // ============================================

    var pageAbout = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pageWhatWeDo = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pageContact = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
            initContactForm();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pageJoinUs = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
            initVolunteerForm();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pageDonorPitch = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pageTerms = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pagePrivacy = {
        init: function() {
            Anim.animatePage(document.querySelector('.landing-wrapper'));
            Anim.startAmbient();
        },
        teardown: function() {
            Anim.killScrollTriggers();
        }
    };

    var pages = {
        home: pageHome,
        about: pageAbout,
        what_we_do: pageWhatWeDo,
        contact: pageContact,
        join_us: pageJoinUs,
        partner_with_us: pageDonorPitch,
        terms: pageTerms,
        privacy: pagePrivacy
    };

    // ============================================
    // NAVIGATION
    // Bootstraps the current page (server-rendered).
    // ============================================

    function navigate(pageName, data) {
        var page = pages[pageName];
        if (!page) return;
        Anim.killScrollTriggers();
        page.init(data || {});
    }

    // ============================================
    // GLOBAL UI BEHAVIORS
    // Attached once, shared across all pages.
    // ============================================

    function setThemeAssets(theme) {
        var favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = theme === 'dark'
                ? '/static/images/favicon-dark.ico'
                : '/static/images/favicon-light.ico';
        }
        var logos = document.querySelectorAll('.theme-logo');
        logos.forEach(function(img) {
            img.src = theme === 'dark'
                ? '/static/images/equiva-dark.svg'
                : '/static/images/equiva-light.svg';
        });
    }

    function initThemeToggle() {
        var toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        var saved = localStorage.getItem('theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var initialTheme = 'light';

        if (saved === 'dark' || (!saved && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            initialTheme = 'dark';
        }

        setThemeAssets(initialTheme);

        toggle.addEventListener('click', function() {
            var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            var newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            setThemeAssets(newTheme);
        });
    }

    function initHoverEffects() {
        // Button press effect (delegated)
        document.addEventListener('mousedown', function(e) {
            var btn = e.target.closest('button, .nav-link, .btn-primary, .btn-secondary, .nav-cta');
            if (!btn || !Anim.enabled) return;
            gsap.to(btn, { scale: 0.96, duration: 0.08, ease: 'power2.in' });
        });

        document.addEventListener('mouseup', function(e) {
            var btn = e.target.closest('button, .nav-link, .btn-primary, .btn-secondary, .nav-cta');
            if (!btn || !Anim.enabled) return;
            gsap.to(btn, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
        });

        // Card hover lift (delegated on body)
        document.addEventListener('mouseenter', function(e) {
            var card = e.target.closest('.service-card, .insight-card');
            if (!card || !Anim.enabled) return;
            gsap.to(card, {
                y: -4,
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1)',
                duration: 0.25,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        }, true);

        document.addEventListener('mouseleave', function(e) {
            var card = e.target.closest('.service-card, .insight-card');
            if (!card || !Anim.enabled) return;
            gsap.to(card, {
                y: 0,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                duration: 0.35,
                ease: 'back.out(1.7)',
                overwrite: 'auto'
            });
        }, true);
    }

    // ============================================
    // LANDING-PAGE-SPECIFIC HELPERS
    // (Will be refactored into pageHome when sub-pages differ)
    // ============================================

    function initNavigation() {
        var nav = document.querySelector('.landing-nav');

        // Scroll effect on navigation bar
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });

        // Smooth scroll for data-scroll-to buttons
        document.querySelectorAll('[data-scroll-to]').forEach(function(el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                var target = document.getElementById(el.getAttribute('data-scroll-to'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Smooth scroll for nav links
        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                var href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    var target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
    }

    function initSubscribeForm() {
        var form = document.getElementById('subscribe-form');
        var messageEl = document.getElementById('form-message');
        var submitBtn = document.getElementById('subscribe-btn');

        if (!form || !submitBtn) return;

        var btnText = submitBtn.querySelector('.btn-text');
        var btnSpinner = submitBtn.querySelector('.btn-spinner');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            var nameInput = document.getElementById('subscriber-name');
            var emailInput = document.getElementById('subscriber-email');
            var email = emailInput.value.trim();
            var name = nameInput.value.trim();

            if (!email) {
                showMessage('Please enter your email address', 'error');
                return;
            }
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                showMessage('Please enter a valid email address', 'error');
                return;
            }

            setLoading(true);

            try {
                var response = await fetch('/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, name: name })
                });
                var data = await response.json();

                if (response.ok) {
                    showMessage(data.message, 'success');
                    form.reset();
                    if (Anim.enabled) {
                        gsap.to('.waitlist-card', {
                            boxShadow: '0 0 0 4px rgba(92, 184, 16, 0.3)',
                            duration: 0.3,
                            yoyo: true,
                            repeat: 1
                        });
                    }
                } else {
                    showMessage(data.message || 'Something went wrong', 'error');
                }
            } catch (error) {
                showMessage('Network error. Please try again.', 'error');
            } finally {
                setLoading(false);
            }
        });

        function setLoading(isLoading) {
            if (isLoading) {
                submitBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnSpinner) btnSpinner.style.display = 'inline';
            } else {
                submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnSpinner) btnSpinner.style.display = 'none';
            }
        }

        function showMessage(text, type) {
            if (!messageEl) return;
            messageEl.textContent = text;
            messageEl.className = 'form-message ' + type;

            if (type === 'success') {
                setTimeout(function() {
                    messageEl.textContent = '';
                    messageEl.className = 'form-message';
                }, 5000);
            }
        }
    }

    function initContactForm() {
        var form = document.getElementById('contact-form');
        var messageEl = document.getElementById('contact-form-message');
        var submitBtn = document.getElementById('contact-submit-btn');

        if (!form || !submitBtn) return;

        var btnText = submitBtn.querySelector('.btn-text');
        var btnSpinner = submitBtn.querySelector('.btn-spinner');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            var emailInput = document.getElementById('contact-email');
            var nameInput = document.getElementById('contact-name');
            var messageInput = document.getElementById('contact-message');
            var email = emailInput.value.trim();

            if (!email) {
                showContactMessage('Please enter your email address', 'error');
                return;
            }
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                showContactMessage('Please enter a valid email address', 'error');
                return;
            }

            setContactLoading(true);

            try {
                var response = await fetch('/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput ? nameInput.value.trim() : '',
                        email: email,
                        topic: document.getElementById('contact-topic').value,
                        message: messageInput ? messageInput.value.trim() : ''
                    })
                });

                if (response.ok) {
                    showContactMessage('Message sent. We\'ll be in touch within 48 hours.', 'success');
                    form.reset();
                } else {
                    var data = await response.json();
                    showContactMessage(data.message || 'Something went wrong. Please try again.', 'error');
                }
            } catch (error) {
                showContactMessage('Network error. Please try again.', 'error');
            } finally {
                setContactLoading(false);
            }
        });

        function setContactLoading(isLoading) {
            if (isLoading) {
                submitBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnSpinner) btnSpinner.style.display = 'inline';
            } else {
                submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnSpinner) btnSpinner.style.display = 'none';
            }
        }

        function showContactMessage(text, type) {
            if (!messageEl) return;
            messageEl.textContent = text;
            messageEl.className = 'form-message ' + type;

            if (type === 'success') {
                setTimeout(function() {
                    messageEl.textContent = '';
                    messageEl.className = 'form-message';
                }, 5000);
            }
        }
    }

    function initVolunteerForm() {
        var form = document.getElementById('volunteer-form');
        var messageEl = document.getElementById('volunteer-form-message');
        var submitBtn = document.getElementById('volunteer-submit-btn');
        if (!form || !submitBtn) return;

        var btnText = submitBtn.querySelector('.btn-text');
        var btnSpinner = submitBtn.querySelector('.btn-spinner');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            var emailInput = document.getElementById('vol-email');
            var nameInput = document.getElementById('vol-name');
            var skillsInput = document.getElementById('vol-skills');
            var messageInput = document.getElementById('vol-message');
            var email = emailInput.value.trim();

            if (!email) {
                show('Please enter your email address', 'error');
                return;
            }
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                show('Please enter a valid email address', 'error');
                return;
            }

            setLoading(true);

            try {
                var response = await fetch('/volunteer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput ? nameInput.value.trim() : '',
                        email: email,
                        skills: skillsInput ? skillsInput.value.trim() : '',
                        message: messageInput ? messageInput.value.trim() : ''
                    })
                });
                var data = await response.json();

                if (response.ok) {
                    show(data.message, 'success');
                    form.reset();
                } else {
                    show(data.message || 'Something went wrong. Please try again.', 'error');
                }
            } catch (error) {
                show('Network error. Please try again.', 'error');
            } finally {
                setLoading(false);
            }
        });

        function setLoading(isLoading) {
            if (isLoading) {
                submitBtn.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnSpinner) btnSpinner.style.display = 'inline';
            } else {
                submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnSpinner) btnSpinner.style.display = 'none';
            }
        }

        function show(text, type) {
            if (!messageEl) return;
            messageEl.textContent = text;
            messageEl.className = 'form-message ' + type;
            if (type === 'success') {
                setTimeout(function() {
                    messageEl.textContent = '';
                    messageEl.className = 'form-message';
                }, 5000);
            }
        }
    }

    function initMobileMenu() {
        var toggle = document.getElementById('nav-toggle');
        var menu = document.getElementById('mobile-menu');
        if (!toggle || !menu) return;

        var isOpen = false;

        function open() {
            isOpen = true;
            toggle.classList.add('open');
            if (Anim.enabled) {
                gsap.to(menu, { visibility: 'visible', opacity: 1, duration: 0.3, ease: 'power3.out' });
            } else {
                menu.style.visibility = 'visible';
                menu.style.opacity = '1';
            }
            document.body.style.overflow = 'hidden';
        }

        function close() {
            isOpen = false;
            toggle.classList.remove('open');
            if (Anim.enabled) {
                gsap.to(menu, { opacity: 0, duration: 0.25, ease: 'power2.in',
                    onComplete: function() { menu.style.visibility = 'hidden'; } });
            } else {
                menu.style.visibility = 'hidden';
                menu.style.opacity = '0';
            }
            document.body.style.overflow = '';
        }

        toggle.addEventListener('click', function() {
            if (isOpen) { close(); } else { open(); }
        });

        // Close on link click
        menu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() { close(); });
        });
    }

    // ============================================
    // APPLICATION INIT
    // Runs once on every page.
    // ============================================

    function init() {
        Anim.init();
        initThemeToggle();
        initHoverEffects();
        initMobileMenu();

        // Detect page from body data attribute (set in base.html)
        var pageName = document.body.getAttribute('data-page') || 'home';
        var page = pages[pageName];

        if (page && typeof page.init === 'function') {
            page.init();
        }
    }

    // ============================================
    // EXPOSE GLOBALS
    // ============================================

    window.C = C;
    window.el = el;
    window.Anim = Anim;
    window.pages = pages;
    window.navigate = navigate;

    // ============================================
    // DOM READY
    // ============================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
