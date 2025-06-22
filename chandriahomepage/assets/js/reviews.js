/*=============== REVIEWS FUNCTIONALITY ===============*/

// Reviews Section JavaScript
class ReviewsManager {    constructor() {        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.userRating = 0;
        this.isMobile = window.innerWidth <= 768;
        this.initialReviewsCount = this.isMobile ? 2 : 3;
        this.loadBatchSize = this.isMobile ? 2 : 3;
        this.reviewsLoaded = this.initialReviewsCount;
        this.totalReviews = 127;
        this.allReviews = this.generateMoreReviews(); // Generate additional reviews
        this.init();
        this.handleResize();
    }    init() {
        this.initStarRating();
        this.initFilterTabs();
        this.initSortSelect();
        this.initReviewActions();
        this.initWriteReviewButton();
        this.initMobileDisplay();    }

    // Handle resize events
    handleResize() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                this.initialReviewsCount = this.isMobile ? 2 : 3;
                this.loadBatchSize = this.isMobile ? 2 : 3;
                this.updateMobileDisplay();
            }
        });
    }

    // Initialize mobile display// Initialize mobile display
    initMobileDisplay() {
        this.hideMobileReviews();
    }

    // Hide reviews beyond mobile limit
    hideMobileReviews() {
        const reviewCards = document.querySelectorAll('.review-card');
        reviewCards.forEach((card, index) => {
            if (index >= this.initialReviewsCount) {
                card.style.display = 'none';
            } else {
                card.style.display = 'block';
            }
        });
        this.reviewsLoaded = this.initialReviewsCount;
        this.updateSeeAllButton();
    }    // Update display when switching between mobile/desktop
    updateMobileDisplay() {
        const reviewCards = document.querySelectorAll('.review-card');
        
        if (this.isMobile) {
            // Hide extra reviews if switching to mobile
            reviewCards.forEach((card, index) => {
                if (index >= this.initialReviewsCount) {
                    card.style.display = 'none';
                }
            });
            this.reviewsLoaded = Math.min(this.reviewsLoaded, this.initialReviewsCount);        } else {
            // Show more reviews if switching to desktop
            const desktopCount = 3; // Desktop initial count
            const visibleCount = Math.min(desktopCount, reviewCards.length);
            reviewCards.forEach((card, index) => {
                if (index < visibleCount) {
                    card.style.display = 'block';
                }
            });
            this.reviewsLoaded = visibleCount;
        }// Update show less button visibility based on review count
        const collapseBtn = document.querySelector('.show-less-reviews-btn');
        if (collapseBtn) {
            if (this.reviewsLoaded > this.initialReviewsCount) {
                collapseBtn.style.display = 'inline-flex';
            } else {
                collapseBtn.style.display = 'none';
            }
        }
        
        this.updateSeeAllButton();
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
    }    // Open review modal (placeholder)
    openReviewModal() {
        if (this.userRating === 0) {
            alert('Please select a rating first!');
            return;
        }
        
        // In a real application, this would open a modal with a full review form
        alert(`Review form for ${this.userRating} stars would open here!`);
    }

    // Generate more reviews data
    generateMoreReviews() {
        const names = [
            'Sarah Johnson', 'Michael Davis', 'Emma Wilson', 'David Brown', 'Olivia Garcia',
            'James Miller', 'Sophia Anderson', 'Robert Taylor', 'Isabella Martinez', 'William Jones',
            'Mia Thomas', 'Alexander White', 'Charlotte Lopez', 'Benjamin Clark', 'Amelia Rodriguez',
            'Lucas Lewis', 'Harper Walker', 'Henry Hall', 'Evelyn Young', 'Sebastian Allen'
        ];
        
        const comments = [
            "Outstanding service! The fitting was perfect and the staff was incredibly helpful.",
            "Beautiful gowns and excellent customer service. Highly recommend!",
            "The quality exceeded my expectations. Perfect for my special day.",
            "Professional staff and gorgeous selection. Will definitely come back.",
            "Amazing experience from start to finish. The alterations were flawless.",
            "Great variety and the fitting consultation was very thorough.",
            "Loved the personalized attention and the final result was stunning.",
            "Excellent quality and the staff made me feel so comfortable.",
            "Perfect fit and beautiful designs. Couldn't be happier!",
            "The team went above and beyond to make sure everything was perfect."
        ];
        
        const tags = [
            ['Wedding Gown', 'Excellent Service'], ['Ball Gown', 'Quality'], ['Formal Wear', 'Professional'],
            ['Evening Wear', 'Beautiful'], ['Fairy Gown', 'Magical'], ['Suits', 'Perfect Fit'],
            ['Accessories', 'Stylish'], ['Long Gown', 'Elegant'], ['Custom Fit', 'Amazing'],
            ['Bridal', 'Dream Come True']
        ];

        return names.map((name, index) => ({
            name: name,
            initial: name.charAt(0),
            rating: Math.random() > 0.3 ? 5 : 4, // Mostly 5 and 4 star reviews
            comment: comments[index % comments.length],
            tags: tags[index % tags.length],
            date: `${Math.floor(Math.random() * 6) + 1} months ago`,
            helpful: Math.floor(Math.random() * 20) + 1,
            category: Math.random() > 0.5 ? 'fitting' : 'service'
        }));
    }    // Load more reviews when button is clicked
    loadMoreReviews() {
        const container = document.querySelector('.customer-reviews-grid');
        const existingCards = container.querySelectorAll('.review-card');
        
        // First, try to show hidden existing reviews
        let reviewsShown = 0;
        for (let i = this.reviewsLoaded; i < existingCards.length && reviewsShown < this.loadBatchSize; i++) {
            const card = existingCards[i];
            if (card.style.display === 'none' || !card.style.display) {
                card.style.display = 'block';
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                // Animate in
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100 * reviewsShown);
                
                this.reviewsLoaded++;
                reviewsShown++;
            }
        }
        
        // If we need more reviews and haven't shown all existing ones, create new ones
        const remainingToLoad = this.loadBatchSize - reviewsShown;
        for (let i = 0; i < remainingToLoad && this.reviewsLoaded < this.totalReviews; i++) {
            const reviewIndex = (this.reviewsLoaded - existingCards.length) % this.allReviews.length;
            const review = this.allReviews[reviewIndex];
            
            const reviewCard = this.createReviewCard(review);
            container.appendChild(reviewCard);
            this.reviewsLoaded++;
        }
        
        // Update button text
        this.updateSeeAllButton();
        
        // Animate new cards in (only the newly created ones)
        if (remainingToLoad > 0) {
            this.animateNewCards();
        }
    }

    // Create a review card element
    createReviewCard(review) {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.setAttribute('data-rating', review.rating);
        card.setAttribute('data-category', review.category);
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        const stars = Array(5).fill(0).map((_, index) => 
            `<i class="fi fi-rs-star review-star ${index < review.rating ? 'filled' : ''}"></i>`
        ).join('');
        
        const tags = review.tags.map(tag => 
            `<span class="review-tag">${tag}</span>`
        ).join('');
        
        card.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        <span class="reviewer-initial">${review.initial}</span>
                    </div>
                    <div class="reviewer-details">
                        <h4 class="reviewer-name">${review.name}</h4>
                        <div class="review-rating">
                            ${stars}
                        </div>
                    </div>
                </div>
                <span class="review-date">${review.date}</span>
            </div>
            <div class="review-content">
                <p class="review-text">"${review.comment}"</p>
                <div class="review-tags">
                    ${tags}
                </div>
            </div>
            <div class="review-bottom">
                <div class="review-divider"></div>
                <div class="review-actions">
                    <button class="review-action-btn">
                        <i class="fi fi-rs-thumbs-up"></i>
                        Helpful (${review.helpful})
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener for helpful button
        const helpfulBtn = card.querySelector('.review-action-btn');
        helpfulBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleHelpful(helpfulBtn);
        });
          return card;
    }

    // Animate new cards in
    animateNewCards() {
        const allCards = document.querySelectorAll('.review-card');
        const newCards = Array.from(allCards).slice(-this.loadBatchSize); // Last batch of cards
        
        newCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Update see all button
    updateSeeAllButton() {
        var seeAllBtn = document.querySelector('.see-all-reviews-btn');
        var remaining = this.totalReviews - this.reviewsLoaded;
        
        var desktopText = seeAllBtn.querySelector('.btn-text-desktop');
        var mobileText = seeAllBtn.querySelector('.btn-text-mobile');
          if (remaining <= 0) {
            if (desktopText) desktopText.textContent = 'All Reviews Loaded';
            if (mobileText) mobileText.textContent = 'All Loaded';
            seeAllBtn.disabled = true;
            seeAllBtn.style.opacity = '0.6';
            seeAllBtn.style.cursor = 'not-allowed';
            
            // Show the "Show Less" button
            this.showCollapseButton();
        } else {
            if (desktopText) desktopText.textContent = 'Load More';
            if (mobileText) mobileText.textContent = 'Load More';
            seeAllBtn.disabled = false;
            seeAllBtn.style.opacity = '1';
            seeAllBtn.style.cursor = 'pointer';
        }
        
        // Show collapse button if we have more than initial reviews
        if (this.reviewsLoaded > this.initialReviewsCount) {
            this.showCollapseButton();
        }
    }    // Show collapse button
    showCollapseButton() {
        let collapseBtn = document.querySelector('.show-less-reviews-btn');
        
        if (!collapseBtn) {
            const reviewsActions = document.querySelector('.reviews-actions');
            collapseBtn = document.createElement('button');
            collapseBtn.className = 'show-less-reviews-btn';            collapseBtn.innerHTML = `Show Less`;
            
            collapseBtn.addEventListener('click', () => {
                this.collapseReviews();
            });
            
            reviewsActions.appendChild(collapseBtn);
        }
          // Show on both mobile and desktop when there are more reviews than initial
        collapseBtn.style.display = 'inline-flex';
    }    // Hide collapse button
    hideCollapseButton() {
        const collapseBtn = document.querySelector('.show-less-reviews-btn');
        if (collapseBtn) {
            collapseBtn.style.setProperty('display', 'none', 'important');
        }
    }// Collapse reviews back to original count
    collapseReviews() {
        const container = document.querySelector('.customer-reviews-grid');
        const allCards = container.querySelectorAll('.review-card');
        
        // Animate out the extra cards first
        const cardsToRemove = Array.from(allCards).slice(this.initialReviewsCount);
        
        cardsToRemove.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(-20px)';
            }, index * 50);
        });
        
        // Remove the cards after animation
        setTimeout(() => {
            cardsToRemove.forEach(card => card.remove());
            
            // Reset state
            this.reviewsLoaded = this.initialReviewsCount;
              // Update button
            const remaining = this.totalReviews - this.reviewsLoaded;
            const seeAllBtn = document.querySelector('.see-all-reviews-btn');
            const desktopText = seeAllBtn.querySelector('.btn-text-desktop');
            const mobileText = seeAllBtn.querySelector('.btn-text-mobile');
              if (desktopText) desktopText.textContent = 'Load More';
            if (mobileText) mobileText.textContent = 'Load More';
            
            seeAllBtn.disabled = false;
            seeAllBtn.style.opacity = '1';
            seeAllBtn.style.cursor = 'pointer';
              // Hide collapse button
            this.hideCollapseButton();
            
            // Smooth scroll to reviews filter section instead of top
            const filterSection = document.querySelector('.reviews-filter-section');
            if (filterSection) {
                filterSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            } else {
                // Fallback to reviews section if filter section not found
                document.querySelector('#reviews').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, cardsToRemove.length * 50 + 200);
    }

    // Initialize see all reviews button
    initSeeAllButton() {
        const seeAllBtn = document.querySelector('.see-all-reviews-btn');
        
        if (seeAllBtn) {
            seeAllBtn.addEventListener('click', () => {
                this.loadMoreReviews();
            });
        }
    }

    // Show all reviews functionality (removed, replaced with loadMoreReviews)
    showAllReviews() {
        // This method is no longer used
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
