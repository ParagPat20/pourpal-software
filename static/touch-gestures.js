// Touch Gesture Handler for Raspberry Pi Touch Display
// This prevents accidental selections when swiping and enables proper gesture recognition

class TouchGestureHandler {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.isSwipe = false;
        this.minSwipeDistance = 50; // Minimum distance for a swipe
        this.maxSwipeTime = 500; // Maximum time for a swipe (ms)
        this.touchThreshold = 10; // Minimum movement to consider it a swipe
        
        this.init();
    }
    
    init() {
        // Add touch event listeners to the document with passive: true for better performance
        // This allows native scrolling and doesn't block browser defaults
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Only prevent text selection on non-input elements
        document.addEventListener('selectstart', (e) => {
            if (!e.target.matches('input, textarea, select')) {
                e.preventDefault();
            }
        });
        
        // Add CSS to prevent text selection and improve touch behavior
        this.addTouchCSS();
    }
    
    handleTouchStart(e) {
        // Don't interfere with input fields, textareas, or select elements
        if (e.target.matches('input, textarea, select, option')) {
            return;
        }
        
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();
        this.isSwipe = false;
        
        // Don't prevent default immediately - let it handle if it's a quick tap
    }
    
    handleTouchMove(e) {
        // Don't interfere with input fields, textareas, or select elements
        if (e.target.matches('input, textarea, select, option')) {
            return;
        }
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - this.startX);
        const deltaY = Math.abs(touch.clientY - this.startY);
        
        // If movement is significant, it's likely a swipe
        if (deltaX > this.touchThreshold || deltaY > this.touchThreshold) {
            this.isSwipe = true;
            // Only prevent default for non-scrollable elements
            // Allow natural scrolling behavior
        }
    }
    
    handleTouchEnd(e) {
        // Don't interfere with input fields, textareas, or select elements
        if (e.target.matches('input, textarea, select, option')) {
            return;
        }
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        const deltaTime = Date.now() - this.startTime;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Determine if this was a swipe gesture
        if (this.isSwipe || (distance > this.minSwipeDistance && deltaTime < this.maxSwipeTime)) {
            // Don't prevent default - let natural behavior work
            
            // Determine swipe direction
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            } else {
                // Vertical swipe
                if (deltaY > 0) {
                    this.handleSwipeDown();
                } else {
                    this.handleSwipeUp();
                }
            }
        }
    }
    
    handleSwipeUp() {
        console.log('Swipe Up detected');
        // Add your swipe up logic here
        // For example: scroll up, show previous page, etc.
        this.scrollPage('up');
    }
    
    handleSwipeDown() {
        console.log('Swipe Down detected');
        // Add your swipe down logic here
        this.scrollPage('down');
    }
    
    handleSwipeLeft() {
        console.log('Swipe Left detected');
        // Add your swipe left logic here
        this.navigatePage('left');
    }
    
    handleSwipeRight() {
        console.log('Swipe Right detected');
        // Add your swipe right logic here
        this.navigatePage('right');
    }
    
    scrollPage(direction) {
        // Get the currently visible scrollable container
        const visibleSection = document.querySelector('[style*="display: block"]') || document.body;
        const scrollContainer = visibleSection.querySelector('.scrollable, .cocktail-list, .ing-list') || visibleSection;
        
        const scrollAmount = 200; // Adjust as needed
        const currentScroll = scrollContainer.scrollTop || window.pageYOffset;
        
        if (direction === 'up') {
            if (scrollContainer !== document.body && scrollContainer.scrollTop !== undefined) {
                scrollContainer.scrollTo({
                    top: Math.max(0, currentScroll - scrollAmount),
                    behavior: 'smooth'
                });
            } else {
                window.scrollTo({
                    top: Math.max(0, currentScroll - scrollAmount),
                    behavior: 'smooth'
                });
            }
        } else if (direction === 'down') {
            if (scrollContainer !== document.body && scrollContainer.scrollTop !== undefined) {
                scrollContainer.scrollTo({
                    top: currentScroll + scrollAmount,
                    behavior: 'smooth'
                });
            } else {
                window.scrollTo({
                    top: currentScroll + scrollAmount,
                    behavior: 'smooth'
                });
            }
        }
    }
    
    navigatePage(direction) {
        // Add navigation logic based on your app structure
        // For example, switch between different sections
        const currentSection = this.getCurrentSection();
        
        switch (direction) {
            case 'left':
                this.showPreviousSection(currentSection);
                break;
            case 'right':
                this.showNextSection(currentSection);
                break;
        }
    }
    
    getCurrentSection() {
        // Determine which section is currently visible
        const sections = ['available-cocktails', 'cocktail-details', 'assign-pipe', 'add-ingredients', 'add-cocktail'];
        
        for (const section of sections) {
            const element = document.getElementById(section);
            if (element && element.style.display !== 'none') {
                return section;
            }
        }
        return 'available-cocktails'; // Default
    }
    
    showPreviousSection(currentSection) {
        const sections = ['available-cocktails', 'cocktail-details', 'assign-pipe', 'add-ingredients', 'add-cocktail'];
        const currentIndex = sections.indexOf(currentSection);
        
        if (currentIndex > 0) {
            const previousSection = sections[currentIndex - 1];
            this.showSection(previousSection);
        }
    }
    
    showNextSection(currentSection) {
        const sections = ['available-cocktails', 'cocktail-details', 'assign-pipe', 'add-ingredients', 'add-cocktail'];
        const currentIndex = sections.indexOf(currentSection);
        
        if (currentIndex < sections.length - 1) {
            const nextSection = sections[currentIndex + 1];
            this.showSection(nextSection);
        }
    }
    
    showSection(sectionName) {
        // Hide all sections
        const sections = ['available-cocktails', 'cocktail-details', 'assign-pipe', 'add-ingredients', 'add-cocktail'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show the target section
        const targetElement = document.getElementById(sectionName);
        if (targetElement) {
            targetElement.style.display = 'block';
        }
        
        // Update button styles
        if (typeof updateButtonStyles === 'function') {
            updateButtonStyles();
        }
    }
    
    addTouchCSS() {
        // Add CSS to improve touch behavior
        const style = document.createElement('style');
        style.textContent = `
            /* Prevent text selection on most elements */
            body, div, span, p, h1, h2, h3, h4, h5, h6 {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
            }
            
            /* ALLOW text selection and interaction in input fields - CRITICAL for keyboard */
            input, textarea, select {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
                touch-action: auto !important;
                pointer-events: auto !important;
            }
            
            /* Improve touch responsiveness for buttons */
            button, .btn, .option, .cocktail-item, .ing-item {
                touch-action: manipulation;
                -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
            }
            
            /* Allow natural scrolling */
            .cocktail-list, .ing-list, .scrollable {
                touch-action: pan-y !important;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            /* Smooth scrolling for swipe gestures */
            html {
                scroll-behavior: smooth;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize touch gesture handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TouchGestureHandler();
    console.log('Touch Gesture Handler initialized');
});
