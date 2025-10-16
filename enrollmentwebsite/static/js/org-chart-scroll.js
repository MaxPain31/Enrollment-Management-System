// Organizational Chart Horizontal Scroll Enhancement
document.addEventListener('DOMContentLoaded', function() {
    const scrollContainers = document.querySelectorAll('.department-section .org-cards-grid, .faculty-level > .org-cards-grid');
    
    scrollContainers.forEach(container => {
        // Check if content is scrollable
        function checkScrollable() {
            const isScrollable = container.scrollWidth > container.clientWidth;
            const parent = container.closest('.department-section') || container.closest('.faculty-level');
            
            if (parent) {
                if (isScrollable) {
                    parent.classList.add('has-scroll');
                } else {
                    parent.classList.remove('has-scroll');
                }
            }
        }
        
        // Initial check
        checkScrollable();
        
        // Check on window resize
        window.addEventListener('resize', checkScrollable);
        
        // Hide scroll indicator when scrolled
        container.addEventListener('scroll', function() {
            const parent = container.closest('.department-section') || container.closest('.faculty-level');
            if (parent) {
                if (container.scrollLeft > 10) {
                    parent.classList.add('scrolled');
                } else {
                    parent.classList.remove('scrolled');
                }
                
                // Check if scrolled to end
                const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
                if (isAtEnd) {
                    parent.classList.add('scroll-end');
                } else {
                    parent.classList.remove('scroll-end');
                }
            }
        });
        
        // Smooth scroll on mouse wheel for better UX (optional)
        container.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    });
    
    // Add touch scroll momentum for mobile devices
    scrollContainers.forEach(container => {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        container.addEventListener('mousedown', (e) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });
        
        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });
    });
});

