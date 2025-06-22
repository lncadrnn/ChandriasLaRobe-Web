/*=============== REVIEWS FUNCTIONALITY ===============*/

// Reviews Section JavaScript
class ReviewsManager {
    constructor() {
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.userRating = 0;
        this.init();
    }

    init() {
        this.initStarRating();
        this.initFilterTabs();
        this.initSortSelect();
        this.initReviewActions();
        this.initWriteReviewButton();
    }

    // Initialize star rating for writing reviews
    initStarRating() {
        const writeStars = document.querySelectorAll('.write-star');
        
        writeStars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                this.highlightStars(index + 1);
            });
            
            star.addEventListener('mouseleave', () => {
                this.highlightStars(this.userRating);
            });
            
            star.addEventListener('click', () => {
                this.userRating = index + 1;
                this.highlightStars(this.userRating);
                this.updateWriteReviewButton();
            });
        });
    }

    highlightStars(rating) {
        const writeStars = document.querySelectorAll('.write-star');
        writeStars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('selected');
            } else {
                star.classList.remove('selected');
            }
        });
    }

    updateWriteReviewButton() {
        const writeBtn = document.querySelector('.write-review-btn');
        if (this.userRating > 0) {
            writeBtn.innerHTML = `
                <i class="fi fi-rs-edit"></i>
                Write ${this.userRating} Star Review
            `;
        } else {
            writeBtn.innerHTML = `
                <i class="fi fi-rs-edit"></i>
                Write a Review
            `;
        }
    }

    // Initialize filter tabs
    initFilterTabs() {
        const filterTabs = document.querySelectorAll('.review-filter-tab');
        
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                filterTabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Update current filter
                this.currentFilter = tab.dataset.filter;
                
                // Filter reviews
                this.filterReviews();
            });
        });
    }

    // Initialize sort select
    initSortSelect() {
        const sortSelect = document.querySelector('.reviews-sort-select');
        
        sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortReviews();
        });
    }

    // Filter reviews based on current filter
    filterReviews() {
        const reviewCards = document.querySelectorAll('.review-card');
        
        reviewCards.forEach(card => {
            const rating = card.dataset.rating;
            const category = card.dataset.category;
            
            let shouldShow = false;
            
            switch (this.currentFilter) {
                case 'all':
                    shouldShow = true;
                    break;
                case '5':
                case '4':
                case '3':
                case '2':
                case '1':
                    shouldShow = rating === this.currentFilter;
                    break;
                case 'fitting':
                case 'service':
                    shouldShow = category === this.currentFilter;
                    break;
            }
            
            if (shouldShow) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
        
        this.updateVisibleCount();
    }

    // Sort reviews based on current sort option
    sortReviews() {
        const container = document.querySelector('.customer-reviews-grid');
        const reviewCards = Array.from(container.querySelectorAll('.review-card'));
        
        reviewCards.sort((a, b) => {
            switch (this.currentSort) {
                case 'newest':
                    return this.getDateValue(b) - this.getDateValue(a);
                case 'oldest':
                    return this.getDateValue(a) - this.getDateValue(b);
                case 'highest':
                    return parseInt(b.dataset.rating) - parseInt(a.dataset.rating);
                case 'lowest':
                    return parseInt(a.dataset.rating) - parseInt(b.dataset.rating);
                default:
                    return 0;
            }
        });
        
        // Re-append sorted cards
        reviewCards.forEach(card => container.appendChild(card));
        
        // Animate cards back in
        this.animateCardsIn();
    }

    // Get date value for sorting (mock function - in real app would parse actual dates)
    getDateValue(card) {
        const dateText = card.querySelector('.review-date').textContent;
        if (dateText.includes('week')) return Date.now() - (parseInt(dateText) || 2) * 7 * 24 * 60 * 60 * 1000;
        if (dateText.includes('month')) return Date.now() - (parseInt(dateText) || 1) * 30 * 24 * 60 * 60 * 1000;
        return Date.now();
    }

    // Animate cards in
    animateCardsIn() {
        const reviewCards = document.querySelectorAll('.review-card');
        reviewCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Update visible count in see all button
    updateVisibleCount() {
        const visibleCards = document.querySelectorAll('.review-card[style*="display: block"], .review-card:not([style*="display: none"])').length;
        const seeAllBtn = document.querySelector('.see-all-reviews-btn');
        
        if (seeAllBtn) {
            if (this.currentFilter === 'all') {
                seeAllBtn.innerHTML = `
                    <i class="fi fi-rs-eye"></i>
                    See All 127 Reviews
                `;
            } else {
                seeAllBtn.innerHTML = `
                    <i class="fi fi-rs-eye"></i>
                    See All ${visibleCards} Filtered Reviews
                `;
            }
        }
    }    // Initialize review action buttons
    initReviewActions() {
        const actionBtns = document.querySelectorAll('.review-action-btn');
        
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (btn.innerHTML.includes('Helpful')) {
                    this.toggleHelpful(btn);
                }
            });
        });
    }    // Toggle helpful button
    toggleHelpful(btn) {
        const currentCount = parseInt(btn.textContent.match(/\d+/)[0]);
        const isHelpful = btn.classList.contains('helpful-active');
        
        if (isHelpful) {
            btn.innerHTML = `
                <i class="fi fi-rs-thumbs-up"></i>
                Helpful (${currentCount - 1})
            `;
            btn.classList.remove('helpful-active');
        } else {
            btn.innerHTML = `
                <i class="fi fi-rs-thumbs-up"></i>
                Helpful (${currentCount + 1})
            `;            btn.classList.add('helpful-active');
            btn.style.background = 'hsla(346, 100%, 74%, 0.1)';
            btn.style.borderColor = 'hsl(346, 100%, 74%)';
            btn.style.color = 'hsl(346, 100%, 74%)';
        }
    }

    // Initialize write review button
    initWriteReviewButton() {
        const writeBtn = document.querySelector('.write-review-btn');
        
        writeBtn.addEventListener('click', () => {
            this.openReviewModal();
        });
    }

    // Open review modal (placeholder)
    openReviewModal() {
        const notyf = new Notyf({
            duration: 4000,
            position: { x: 'right', y: 'top' }
        });
        
        if (this.userRating === 0) {
            notyf.error('Please select a rating first!');
            return;
        }
        
        // In a real application, this would open a modal with a full review form
        notyf.success(`Review form for ${this.userRating} stars would open here!`);
    }

    // Initialize see all reviews button
    initSeeAllButton() {
        const seeAllBtn = document.querySelector('.see-all-reviews-btn');
        
        if (seeAllBtn) {
            seeAllBtn.addEventListener('click', () => {
                // In a real application, this would navigate to a full reviews page
                // or load more reviews
                const notyf = new Notyf({
                    duration: 3000,
                    position: { x: 'right', y: 'top' }
                });
                
                notyf.success('Loading more reviews...');
                
                // Mock loading more reviews
                setTimeout(() => {
                    notyf.success('All reviews loaded!');
                }, 1500);
            });
        }
    }
}

// Animation for rating bars on scroll
function animateRatingBars() {
    const ratingBars = document.querySelectorAll('.rating-fill');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const width = bar.style.width;
                bar.style.width = '0%';
                
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            }
        });
    }, { threshold: 0.5 });
    
    ratingBars.forEach(bar => observer.observe(bar));
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize reviews manager
    const reviewsManager = new ReviewsManager();
    
    // Initialize rating bar animations
    animateRatingBars();
    
    // Initialize see all button
    reviewsManager.initSeeAllButton();
    
    // Add smooth scrolling to reviews section if linked from navigation
    const reviewsLink = document.querySelector('a[href="#reviews"]');
    if (reviewsLink) {
        reviewsLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('#reviews').scrollIntoView({
                behavior: 'smooth'
            });
        });
    }
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReviewsManager;
}
