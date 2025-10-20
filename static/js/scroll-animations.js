// ScrollReveal.js Animations for Index Page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize ScrollReveal
    const sr = ScrollReveal({
        distance: '30px',
        duration: 800,
        easing: 'ease-in-out',
        origin: 'bottom',
        reset: false,
        mobile: true,
        desktop: true,
        cleanup: true
    });

    // Home content animation
    sr.reveal('.home-content', {
        delay: 100,
        duration: 1000,
        origin: 'bottom',
        distance: '50px'
    });

    // Announcement cards with stagger
    sr.reveal('.announcement-card', {
        delay: 150,
        duration: 800,
        origin: 'left',
        distance: '40px',
        interval: 200
    });

    // Organization cards with stagger
    sr.reveal('.org-card', {
        delay: 100,
        duration: 700,
        origin: 'bottom',
        distance: '30px',
        interval: 100,
        scale: 0.9
    });

    // Contact cards with stagger
    sr.reveal('.contact-card', {
        delay: 400,
        duration: 800,
        origin: 'bottom',
        distance: '40px',
        interval: 250,
        rotate: { x: 10, y: 0, z: 0 }
    });

    // FAQ items with stagger
    sr.reveal('.faq-item', {
        delay: 300,
        duration: 600,
        origin: 'right',
        distance: '30px',
        interval: 120
    });

    // Section titles
    sr.reveal('.org-section-title', {
        delay: 100,
        duration: 800,
        origin: 'top',
        distance: '30px'
    });

    // Department sections
    sr.reveal('.department-section', {
        delay: 200,
        duration: 700,
        origin: 'bottom',
        distance: '40px'
    });

    // No announcements message
    sr.reveal('.no-announcements', {
        delay: 200,
        duration: 600,
        origin: 'bottom',
        distance: '20px'
    });

    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Parallax effect for carousel
    const carousel = document.querySelector('.carousel');
    if (carousel) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.3;
            carousel.style.transform = `translateY(${rate}px)`;
        });
    }

    // Counter animation for numbers (if any)
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-count'));
                const duration = 2000; // 2 seconds
                const increment = target / (duration / 16); // 60fps
                let current = 0;
                
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
});

// Smooth scrolling for the entire page
document.documentElement.style.scrollBehavior = 'smooth';

// Add scroll progress indicator
function createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #007bff, #0056b3);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

// Initialize scroll progress
createScrollProgress();

