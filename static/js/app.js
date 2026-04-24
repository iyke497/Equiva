// ============================================
// TRADEWEFT LANDING PAGE — ANIMATION & INTERACTION
// Based on BudgetIQ Anim module patterns
// ============================================

(function() {
    'use strict';
    
    // ============================================
    // ANIMATION MODULE
    // ============================================
    
    const Anim = {
        enabled: true,
        
        init: function() {
            // Check for reduced motion preference
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.enabled = false;
                gsap.globalTimeline.timeScale(20);
            }
            
            // Register GSAP plugins
            gsap.registerPlugin(ScrollTrigger);
            
            // Set global defaults
            gsap.defaults({
                ease: 'power3.out',
                duration: 0.6
            });
        },
        
        animateHero: function() {
            if (!this.enabled) return;
            
            const tl = gsap.timeline();
            
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
        },
        
        animateCardsOnScroll: function() {
            if (!this.enabled) return;
            
            // Service cards reveal
            ScrollTrigger.batch('.service-card', {
                onEnter: (batch) => {
                    gsap.fromTo(batch,
                        { opacity: 0, y: 40 },
                        { opacity: 1, y: 0, stagger: 0.12, duration: 0.6, ease: 'back.out(1.4)' }
                    );
                },
                start: 'top 85%',
                once: true
            });
            
            // Insight cards reveal
            ScrollTrigger.batch('.insight-card', {
                onEnter: (batch) => {
                    gsap.fromTo(batch,
                        { opacity: 0, x: -30 },
                        { opacity: 1, x: 0, stagger: 0.1, duration: 0.6, ease: 'power3.out' }
                    );
                },
                start: 'top 85%',
                once: true
            });
            
            // About content reveal
            ScrollTrigger.batch(['.about-text', '.value-item'], {
                onEnter: (batch) => {
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
                onEnter: () => {
                    gsap.fromTo('.waitlist-card',
                        { opacity: 0, y: 50, scale: 0.95 },
                        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' }
                    );
                }
            });
        },
        
        startAmbient: function() {
            if (!this.enabled) return;
            
            // Hero glow drift
            gsap.to('.hero-glow-1', {
                x: 30,
                y: -20,
                duration: 8,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
            
            gsap.to('.hero-glow-2', {
                x: -30,
                y: 20,
                duration: 10,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
            
            // Visual accent rotation
            gsap.to('.visual-accent', {
                rotation: 360,
                duration: 30,
                repeat: -1,
                ease: 'none'
            });
        },
        
        killScrollTriggers: function() {
            ScrollTrigger.getAll().forEach(st => st.kill());
        }
    };
    
    // ============================================
    // NAVIGATION
    // ============================================
    
    function initNavigation() {
        const nav = document.querySelector('.landing-nav');
        
        // Scroll effect on navigation
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
        
        // Smooth scroll for anchor links
        document.querySelectorAll('[data-scroll-to]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = el.getAttribute('data-scroll-to');
                const target = document.getElementById(targetId);
                
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Nav links smooth scroll
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }
    
    // ============================================
    // FORM HANDLING
    // ============================================
    
    function initSubscribeForm() {
        const form = document.getElementById('subscribe-form');
        const messageEl = document.getElementById('form-message');
        const submitBtn = document.getElementById('subscribe-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('subscriber-name');
            const emailInput = document.getElementById('subscriber-email');
            const email = emailInput.value.trim();
            const name = nameInput.value.trim();
            
            // Basic validation
            if (!email) {
                showMessage('Please enter your email address', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showMessage('Please enter a valid email address', 'error');
                return;
            }
            
            // Show loading state
            setLoading(true);
            
            try {
                const response = await fetch('/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, name })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage(data.message, 'success');
                    form.reset();
                    
                    // Animate success
                    if (Anim.enabled) {
                        gsap.to('.waitlist-card', {
                            boxShadow: '0 0 0 4px rgba(75, 170, 115, 0.3)',
                            duration: 0.3,
                            yoyo: true,
                            repeat: 1
                        });
                    }
                } else {
                    showMessage(data.message || 'Something went wrong', 'error');
                }
            } catch (error) {
                console.error('Subscription error:', error);
                showMessage('Network error. Please try again.', 'error');
            } finally {
                setLoading(false);
            }
        });
        
        function setLoading(isLoading) {
            if (isLoading) {
                submitBtn.disabled = true;
                btnText.style.display = 'none';
                btnSpinner.style.display = 'inline';
            } else {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnSpinner.style.display = 'none';
            }
        }
        
        function showMessage(text, type) {
            messageEl.textContent = text;
            messageEl.className = `form-message ${type}`;
            
            // Auto-clear success message after 5 seconds
            if (type === 'success') {
                setTimeout(() => {
                    messageEl.textContent = '';
                    messageEl.className = 'form-message';
                }, 5000);
            }
        }
        
        function isValidEmail(email) {
            const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return pattern.test(email);
        }
    }
    
    // ============================================
    // HOVER MICRO-INTERACTIONS
    // ============================================
    
    function initHoverEffects() {
        // Button press effect
        document.addEventListener('mousedown', (e) => {
            const btn = e.target.closest('button, .nav-link, .btn-primary, .btn-secondary');
            if (!btn || !Anim.enabled) return;
            
            gsap.to(btn, {
                scale: 0.96,
                duration: 0.08,
                ease: 'power2.in'
            });
        });
        
        document.addEventListener('mouseup', (e) => {
            const btn = e.target.closest('button, .nav-link, .btn-primary, .btn-secondary');
            if (!btn || !Anim.enabled) return;
            
            gsap.to(btn, {
                scale: 1,
                duration: 0.4,
                ease: 'elastic.out(1, 0.4)'
            });
        });
        
        // Card hover lift
        document.querySelectorAll('.service-card, .insight-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                if (!Anim.enabled) return;
                gsap.to(this, {
                    y: -4,
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.1)',
                    duration: 0.25,
                    ease: 'power2.out'
                });
            });
            
            card.addEventListener('mouseleave', function() {
                if (!Anim.enabled) return;
                gsap.to(this, {
                    y: 0,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                    duration: 0.35,
                    ease: 'back.out(1.7)'
                });
            });
        });
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        // Initialize animation module
        Anim.init();
        
        // Run hero animation
        Anim.animateHero();
        
        // Setup scroll-triggered animations
        Anim.animateCardsOnScroll();
        
        // Start ambient animations
        Anim.startAmbient();
        
        // Initialize navigation
        initNavigation();
        
        // Initialize form
        initSubscribeForm();
        
        // Initialize hover effects
        initHoverEffects();
        
        console.log('Equiva — Landing page initialized');
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
