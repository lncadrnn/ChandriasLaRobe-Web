/*=============== REVIEWS FUNCTIONALITY ===============*/
import {
    auth,
    chandriaDB,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    orderBy,
    query,
    startAfter,
    limit
} from "./sdk/chandrias-sdk.js";

const notyf = new Notyf({
    duration: 2500,
    position: {
        x: "center",
        y: "top"
    },
    dismissible: true
});

// Reviews Section JavaScript
class ReviewsManager {
    constructor() {
        this.currentFilter = "all";
        this.currentSort = "newest";
        this.userRating = 0;
        this.selectedTags = []; // Track selected review tags
        this.isMobile = window.innerWidth <= 768;

        this.loadBatchSize = this.isMobile ? 2 : 4; // or however many you want per batch
        this.reviewsLoaded = 0;
        this.lastVisibleReviewDoc = null;

        this.initialReviewsCount = this.loadBatchSize;

        this.hasLoadedInitialReviews = false;
        this.hasLoadedInitialBatch = false;

        this.loadingReviews = false;

        this.totalReviews = 127;

        this.init();
        this.handleResize();
    }
    init() {
        this.initStarRating();
        this.initFilterTabs();
        this.initSortSelect();
        this.initReviewActions();
        this.initWriteReviewButton();
        // this.initMobileDisplay();
        this.initModalFeatures();
    }

    // Handle resize events
    handleResize() {
        window.addEventListener("resize", () => {
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
    // initMobileDisplay() {
    //     this.hideMobileReviews();
    // }

    // Hide reviews beyond mobile limit
    // hideMobileReviews() {
    //     const reviewCards = document.querySelectorAll(".review-card");
    //     reviewCards.forEach((card, index) => {
    //         if (index >= this.initialReviewsCount) {
    //             card.style.display = "none";
    //         } else {
    //             card.style.display = "block";
    //         }
    //     });
    //     this.reviewsLoaded = this.initialReviewsCount;
    //     this.updateSeeAllButton();
    //     console.warn("This might be it? 1st");
    // }

    // Update display when switching between mobile/desktop
    // updateMobileDisplay() {
    //     const reviewCards = document.querySelectorAll(".review-card");

    //     if (this.isMobile) {
    //         // Hide extra reviews if switching to mobile
    //         reviewCards.forEach((card, index) => {
    //             if (index >= this.initialReviewsCount) {
    //                 card.style.display = "none";
    //             }
    //         });
    //         this.reviewsLoaded = Math.min(
    //             this.reviewsLoaded,
    //             this.initialReviewsCount
    //         );
    //     } else {
    //         // Show more reviews if switching to desktop
    //         const desktopCount = 3; // Desktop initial count
    //         const visibleCount = Math.min(desktopCount, reviewCards.length);
    //         reviewCards.forEach((card, index) => {
    //             if (index < visibleCount) {
    //                 card.style.display = "block";
    //             }
    //         });
    //         this.reviewsLoaded = visibleCount;
    //     } // Update show less button visibility based on review count
    //     const collapseBtn = document.querySelector(".show-less-reviews-btn");
    //     if (collapseBtn) {
    //         if (this.reviewsLoaded > this.initialReviewsCount) {
    //             collapseBtn.style.display = "inline-flex";
    //         } else {
    //             collapseBtn.style.display = "none";
    //         }
    //     }

    //     this.updateSeeAllButton();
    // }

    // Initialize star rating for writing reviews
    initStarRating() {
        const writeStars = document.querySelectorAll(".write-star");

        writeStars.forEach((star, index) => {
            star.addEventListener("mouseenter", () => {
                this.highlightStars(index + 1);
            });

            star.addEventListener("mouseleave", () => {
                this.highlightStars(this.userRating);
            });

            star.addEventListener("click", () => {
                this.userRating = index + 1;
                this.highlightStars(this.userRating);
                this.updateWriteReviewButton();
            });
        });
    }

    highlightStars(rating) {
        const writeStars = document.querySelectorAll(".write-star");
        writeStars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add("selected");
            } else {
                star.classList.remove("selected");
            }
        });
    }

    updateWriteReviewButton() {
        const writeBtn = document.querySelector(".write-review-btn");
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
        const filterTabs = document.querySelectorAll(".review-filter-tab");

        filterTabs.forEach(tab => {
            tab.addEventListener("click", () => {
                // Remove active class from all tabs
                filterTabs.forEach(t => t.classList.remove("active"));

                // Add active class to clicked tab
                tab.classList.add("active");

                // Update current filter
                this.currentFilter = tab.dataset.filter;

                // Filter reviews
                this.filterReviews();
            });
        });
    }

    // Initialize sort select
    initSortSelect() {
        const sortSelect = document.querySelector(".reviews-sort-select");

        sortSelect.addEventListener("change", e => {
            this.currentSort = e.target.value;
            this.sortReviews();
        });
    }

    // Filter reviews based on current filter
    filterReviews() {
        const reviewCards = document.querySelectorAll(".review-card");

        reviewCards.forEach(card => {
            const rating = card.dataset.rating;
            const category = card.dataset.category;

            let shouldShow = false;

            switch (this.currentFilter) {
                case "all":
                    shouldShow = true;
                    break;
                case "5":
                case "4":
                case "3":
                case "2":
                case "1":
                    shouldShow = rating === this.currentFilter;
                    break;
                case "fitting":
                case "service":
                    shouldShow = category === this.currentFilter;
                    break;
            }

            if (shouldShow) {
                card.style.display = "block";
                setTimeout(() => {
                    card.style.opacity = "1";
                    card.style.transform = "translateY(0)";
                }, 10);
            } else {
                card.style.opacity = "0";
                card.style.transform = "translateY(20px)";
                setTimeout(() => {
                    card.style.display = "none";
                }, 300);
            }
        });

        this.updateVisibleCount();
    }

    // Sort reviews based on current sort option
    sortReviews() {
        const container = document.querySelector(".customer-reviews-grid");
        const reviewCards = Array.from(
            container.querySelectorAll(".review-card")
        );

        reviewCards.sort((a, b) => {
            switch (this.currentSort) {
                case "newest":
                    return this.getDateValue(b) - this.getDateValue(a);
                case "oldest":
                    return this.getDateValue(a) - this.getDateValue(b);
                case "highest":
                    return (
                        parseInt(b.dataset.rating) - parseInt(a.dataset.rating)
                    );
                case "lowest":
                    return (
                        parseInt(a.dataset.rating) - parseInt(b.dataset.rating)
                    );
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
        const dateText = card.querySelector(".review-date").textContent;
        if (dateText.includes("week"))
            return (
                Date.now() - (parseInt(dateText) || 2) * 7 * 24 * 60 * 60 * 1000
            );
        if (dateText.includes("month"))
            return (
                Date.now() -
                (parseInt(dateText) || 1) * 30 * 24 * 60 * 60 * 1000
            );
        return Date.now();
    }

    // Animate cards in
    animateCardsIn() {
        const reviewCards = document.querySelectorAll(".review-card");
        reviewCards.forEach((card, index) => {
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";

            setTimeout(() => {
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, index * 100);
        });
    }

    // Update visible count in see all button
    updateVisibleCount() {
        const visibleCards = document.querySelectorAll(
            '.review-card[style*="display: block"], .review-card:not([style*="display: none"])'
        ).length;
        const seeAllBtn = document.querySelector(".see-all-reviews-btn");

        if (seeAllBtn) {
            if (this.currentFilter === "all") {
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
    } // Initialize review action buttons
    initReviewActions() {
        const actionBtns = document.querySelectorAll(".review-action-btn");

        actionBtns.forEach(btn => {
            btn.addEventListener("click", e => {
                e.preventDefault();

                if (btn.innerHTML.includes("Helpful")) {
                    this.toggleHelpful(btn);
                }
            });
        });
    } // Toggle helpful button
    toggleHelpful(btn) {
        const currentCount = parseInt(btn.textContent.match(/\d+/)[0]);
        const isHelpful = btn.classList.contains("helpful-active");

        if (isHelpful) {
            btn.innerHTML = `
                <i class="fi fi-rs-thumbs-up"></i>
                Helpful (${currentCount - 1})
            `;
            btn.classList.remove("helpful-active");
        } else {
            btn.innerHTML = `
                <i class="fi fi-rs-thumbs-up"></i>
                Helpful (${currentCount + 1})
            `;
            btn.classList.add("helpful-active");
            btn.style.background = "hsla(346, 100%, 74%, 0.1)";
            btn.style.borderColor = "hsl(346, 100%, 74%)";
            btn.style.color = "hsl(346, 100%, 74%)";
        }
    }

    // Initialize write review button
    initWriteReviewButton() {
        const writeBtn = document.querySelector(".write-review-btn");

        writeBtn.addEventListener("click", () => {
            this.openReviewModal();
        });
    }

    // Open review modal
    openReviewModal() {
        if (this.userRating === 0) {
            // Create Notyf notification with top center positioning
            const notyf = new Notyf({
                duration: 3000,
                position: {
                    x: "center",
                    y: "top"
                },
                dismissible: true
            });

            notyf.error("Please select a rating first!");

            // Add shake animation to rating stars
            const starsContainer = document.querySelector(
                ".write-review-stars"
            );
            if (starsContainer) {
                starsContainer.classList.add("shake-animation");
                setTimeout(() => {
                    starsContainer.classList.remove("shake-animation");
                }, 600);
            }

            return;
        }

        // Open the review modal
        this.showReviewModal();
    }

    // Show review modal
    showReviewModal() {
        const modal = document.getElementById("review-modal");
        if (modal) {
            modal.style.display = "flex";
            document.body.style.overflow = "hidden";

            // Reset modal form state
            this.resetModalForm();

            // Set the selected rating in the modal
            this.updateModalStars();
            this.updateRatingDescription();
        }
    }

    // Update stars in modal based on user rating
    updateModalStars() {
        const modalStars = document.querySelectorAll(".modal-review-star");
        modalStars.forEach((star, index) => {
            if (index < this.userRating) {
                star.classList.add("active");
            } else {
                star.classList.remove("active");
            }
        });
        console.info(`Selected star rating: ${this.userRating}`);
    }

    // Update rating description text
    updateRatingDescription() {
        const descriptions = {
            1: "⭐ Poor - Not satisfied",
            2: "⭐⭐ Fair - Below expectations",
            3: "⭐⭐⭐ Good - Meets expectations",
            4: "⭐⭐⭐⭐ Very Good - Exceeds expectations",
            5: "⭐⭐⭐⭐⭐ Excellent - Outstanding experience"
        };

        const descriptionElement =
            document.getElementById("rating-description");
        if (descriptionElement && this.userRating > 0) {
            descriptionElement.textContent = descriptions[this.userRating];
            descriptionElement.style.color =
                this.userRating >= 4
                    ? "#059669"
                    : this.userRating >= 3
                    ? "#f59e0b"
                    : "#dc2626";
        }
    }

    // Close review modal
    closeReviewModal() {
        const modal = document.getElementById("review-modal");
        if (modal) {
            modal.style.display = "none";
            document.body.style.overflow = "auto";
        }
    }

    // Handle review form submission
    async submitReview() {
        const reviewText = document.getElementById("review-text").value.trim();

        // Validate review text length
        if (reviewText.length < 10) {
            notyf.error("Please write at least 10 characters for your review.");
            return;
        }

        if (reviewText.length > 250) {
            notyf.error("Review cannot exceed 250 characters.");
            return;
        }

        // Validate selected tags
        if (this.selectedTags.length !== 2) {
            notyf.error("Please select exactly 2 tags for your review.");
            return;
        }

        // Validate star rating
        if (this.userRating === 0) {
            notyf.error("Please select a star rating.");
            return;
        }

        // Get current user
        const user = auth.currentUser;
        if (!user) {
            notyf.error("You must be logged in to submit a review.");
            showAuthModal();
            return;
        }

        // 🔍 Get user full name from "userAccounts" collection
        let fullname = "Something Went Wrong";
        let profileImageUrl = "null";
        try {
            const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                fullname =
                    userDocSnap.data().fullname ||
                    "There's no Fullname Set for the User";
                profileImageUrl = userDocSnap.data().profileImageUrl || "";
            }
        } catch (error) {
            console.error("Failed to fetch fullname from userAccounts:", error);
        }

        const tagSelected = this.selectedTags.map(tag => tag.text);

        // Prepare review data
        const reviewData = {
            uid: user.uid,
            profileImageUrl: profileImageUrl,
            fullname: fullname,
            email: user.email,
            rating: this.userRating,
            text: reviewText,
            tags: tagSelected,
            createdAt: new Date()
        };

        // Submit to Firestore
        try {
            const reviewsRef = collection(chandriaDB, "shopReviews");
            const reviewDoc = await addDoc(reviewsRef, reviewData);

            // Save also to user's subcollection: userAccounts/{uid}/userReviews
            const userReviewRef = collection(
                chandriaDB,
                "userAccounts",
                user.uid,
                "userReviews"
            );
            await addDoc(userReviewRef, {
                ...reviewData,
                shopReviewId: reviewDoc.id
            });

            notyf.success(
                "Thank you! Your review has been submitted successfully!"
            );
        } catch (error) {
            console.error("Error submitting review:", error);
            notyf.error("Failed to submit review. Please try again later.");
            return;
        }

        // Reset form and close modal
        document.getElementById("review-text").value = "";
        this.closeReviewModal();

        this.userRating = 0;
        this.selectedTags = [];
        this.highlightStars(0);
        this.updateWriteReviewButton();
        this.resetModalForm();
    }

    // Reset modal form state
    resetModalForm() {
        // Reset character count
        const charCount = document.getElementById("char-count");
        if (charCount) {
            charCount.textContent = "0";
            charCount.style.color = "#dc2626";
        }

        // Reset selected tags
        this.selectedTags = [];
        this.updateSelectedTagsDisplay();

        // Reset tag option buttons
        const tagOptions = document.querySelectorAll(".review-tag-option");
        tagOptions.forEach(option => {
            option.classList.remove("selected");
        });

        // Reset rating description
        const descriptionElement =
            document.getElementById("rating-description");
        if (descriptionElement) {
            descriptionElement.textContent = "Select a rating above";
            descriptionElement.style.color = "";
        }
    }

    // Initialize modal features
    initModalFeatures() {
        // Character counting for review textarea
        const reviewTextarea = document.getElementById("review-text");
        const charCount = document.getElementById("char-count");

        if (reviewTextarea && charCount) {
            reviewTextarea.addEventListener("input", () => {
                let currentLength = reviewTextarea.value.length;

                // Prevent typing beyond 250 characters
                if (currentLength > 250) {
                    reviewTextarea.value = reviewTextarea.value.substring(
                        0,
                        250
                    );
                    currentLength = 250;
                }

                charCount.textContent = currentLength;

                // Change color based on length
                if (currentLength >= 240) {
                    charCount.style.color = "#dc2626"; // Red when approaching limit
                } else if (currentLength >= 200) {
                    charCount.style.color = "#f59e0b"; // Orange when getting close
                } else if (currentLength >= 10) {
                    charCount.style.color = "#059669"; // Green when valid
                } else {
                    charCount.style.color = "#dc2626"; // Red when below minimum
                }
            });
        }

        const modalStars = document.querySelectorAll(".modal-review-star");
        modalStars.forEach((star, index) => {
            star.addEventListener("click", () => {
                this.userRating = index + 1;
                this.updateModalStars();
                this.updateRatingDescription();
                this.updateWriteReviewButton();

                // ✅ Log the selected rating
                // console.info(`Selected star rating: ${this.userRating}`);
            });
        });

        // Tag selection functionality
        this.initTagSelection();

        // Close modal when clicking outside
        const modal = document.getElementById("review-modal");
        if (modal) {
            modal.addEventListener("click", e => {
                if (e.target === modal) {
                    this.closeReviewModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                this.closeReviewModal();
            }
        });
    }

    // Initialize tag selection
    initTagSelection() {
        const tagOptions = document.querySelectorAll(".review-tag-option");

        tagOptions.forEach(tagOption => {
            tagOption.addEventListener("click", () => {
                const tagValue = tagOption.getAttribute("data-tag");
                const tagText = tagOption.textContent.trim();

                if (tagOption.classList.contains("selected")) {
                    // Remove tag
                    this.removeTag(tagValue);
                    tagOption.classList.remove("selected");
                } else if (this.selectedTags.length < 2) {
                    // Add tag (max 2)
                    this.addTag(tagValue, tagText);
                    tagOption.classList.add("selected");
                } else {
                    // Show notification if trying to select more than 2
                    const notyf = new Notyf({
                        duration: 2000,
                        position: {
                            x: "center",
                            y: "top"
                        },
                        dismissible: true
                    });
                    notyf.error("You can only select up to 2 tags.");
                }

                this.updateSelectedTagsDisplay();
            });
        });
    }

    // Add tag to selected tags
    addTag(tagValue, tagText) {
        if (!this.selectedTags.find(tag => tag.value === tagValue)) {
            this.selectedTags.push({ value: tagValue, text: tagText });
        }
    }

    // Remove tag from selected tags
    removeTag(tagValue) {
        this.selectedTags = this.selectedTags.filter(
            tag => tag.value !== tagValue
        );
    }

    // Update selected tags display
    updateSelectedTagsDisplay() {
        const container = document.getElementById("selected-tags-container");
        if (!container) return;

        container.innerHTML = "";

        console.info("Selected tags:", this.selectedTags);

        if (this.selectedTags.length === 0) {
            container.innerHTML =
                '<span style="color: #9ca3af; font-size: 0.875rem;">No tags selected</span>';
            return;
        }

        this.selectedTags.forEach(tag => {
            const tagElement = document.createElement("div");
            tagElement.className = "selected-tag-item";
            tagElement.innerHTML = `
                <span>${tag.text}</span>
                <button type="button" class="remove-tag" onclick="reviewsController.removeTagFromDisplay('${tag.value}')">×</button>
            `;
            container.appendChild(tagElement);
        });
    }

    // Remove tag from display (called from HTML)
    removeTagFromDisplay(tagValue) {
        this.removeTag(tagValue);

        // Update tag option button
        const tagOption = document.querySelector(`[data-tag="${tagValue}"]`);
        if (tagOption) {
            tagOption.classList.remove("selected");
        }

        this.updateSelectedTagsDisplay();
    }

    // Load more reviews when button is clicked
    // loadMoreReviews() {
    //     const container = document.querySelector(".customer-reviews-grid");
    //     const existingCards = container.querySelectorAll(".review-card");

    //     // First, try to show hidden existing reviews
    //     let reviewsShown = 0;
    //     for (
    //         let i = this.reviewsLoaded;
    //         i < existingCards.length && reviewsShown < this.loadBatchSize;
    //         i++
    //     ) {
    //         const card = existingCards[i];
    //         if (card.style.display === "none" || !card.style.display) {
    //             card.style.display = "block";
    //             card.style.opacity = "0";
    //             card.style.transform = "translateY(20px)";

    //             // Animate in
    //             setTimeout(() => {
    //                 card.style.opacity = "1";
    //                 card.style.transform = "translateY(0)";
    //             }, 100 * reviewsShown);

    //             this.reviewsLoaded++;
    //             reviewsShown++;
    //         }
    //     }

    //     // If we need more reviews and haven't shown all existing ones, create new ones
    //     const remainingToLoad = this.loadBatchSize - reviewsShown;
    //     for (
    //         let i = 0;
    //         i < remainingToLoad && this.reviewsLoaded < this.totalReviews;
    //         i++
    //     ) {
    //         const reviewIndex =
    //             (this.reviewsLoaded - existingCards.length) %
    //             this.allReviews.length;
    //         const review = this.allReviews[reviewIndex];

    //         const reviewCard = this.createReviewCard(review);
    //         container.appendChild(reviewCard);
    //         this.reviewsLoaded++;
    //     }

    //     // Update button text
    //     this.updateSeeAllButton();

    //     // Animate new cards in (only the newly created ones)
    //     if (remainingToLoad > 0) {
    //         this.animateNewCards();
    //     }
    // }

    // Create a review card element
    // createReviewCard(review) {
    //     const card = document.createElement("div");
    //     card.className = "review-card";
    //     card.setAttribute("data-rating", review.rating);
    //     card.setAttribute("data-category", review.category);
    //     card.style.opacity = "0";
    //     card.style.transform = "translateY(20px)";

    //     const stars = Array(5)
    //         .fill(0)
    //         .map(
    //             (_, index) =>
    //                 `<i class="fi fi-rs-star review-star ${
    //                     index < review.rating ? "filled" : ""
    //                 }"></i>`
    //         )
    //         .join("");

    //     const tags = review.tags
    //         .map(tag => `<span class="review-tag">${tag}</span>`)
    //         .join("");

    //     card.innerHTML = `
    //         <div class="review-header">
    //             <div class="reviewer-info">
    //                 <div class="reviewer-avatar">
    //                     <span class="reviewer-initial">${review.initial}</span>
    //                 </div>
    //                 <div class="reviewer-details">
    //                     <h4 class="reviewer-name">${review.name}</h4>
    //                     <div class="review-rating">
    //                         ${stars}
    //                     </div>
    //                 </div>
    //             </div>
    //             <span class="review-date">${review.date}</span>
    //         </div>
    //         <div class="review-content">
    //             <p class="review-text">"${review.comment}"</p>
    //             <div class="review-tags">
    //                 ${tags}
    //             </div>
    //         </div>
    //         <div class="review-bottom">
    //             <div class="review-divider"></div>
    //             <div class="review-actions">
    //                 <button class="review-action-btn">
    //                     <i class="fi fi-rs-thumbs-up"></i>
    //                     Helpful (${review.helpful})
    //                 </button>
    //             </div>
    //         </div>
    //     `;

    //     // Add event listener for helpful button
    //     const helpfulBtn = card.querySelector(".review-action-btn");
    //     helpfulBtn.addEventListener("click", e => {
    //         e.preventDefault();
    //         this.toggleHelpful(helpfulBtn);
    //     });
    //     return card;
    // }

    // HERE

    async loadMoreReviews() {
        if (this.loadingReviews) return; // ✅ Prevent double call
        this.loadingReviews = true;

        const $reviewsContainer = $(".customer-reviews-grid");

        if (!this.hasLoadedInitialReviews) {
            $reviewsContainer.empty(); // Clear hardcoded reviews
            this.hasLoadedInitialReviews = true;
        }

        // Firestore query setup
        const reviewsRef = collection(chandriaDB, "shopReviews");
        let q = query(
            reviewsRef,
            orderBy("createdAt", "desc"),
            limit(this.loadBatchSize)
        );

        if (this.lastVisibleReviewDoc) {
            q = query(
                reviewsRef,
                orderBy("createdAt", "desc"),
                startAfter(this.lastVisibleReviewDoc),
                limit(this.loadBatchSize)
            );
        }

        try {
            const snapshot = await getDocs(q);

            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (lastDoc) this.lastVisibleReviewDoc = lastDoc;

            if (snapshot.empty) {
                notyf.error("No more reviews to load.");
                this.loadingReviews = false;
                return;
            }

            // ✅ Track the first batch's last doc for future resets
            if (!this.hasLoadedInitialBatch) {
                this.lastInitialDoc = lastDoc;
                this.hasLoadedInitialBatch = true;
            }

            for (const docSnap of snapshot.docs) {
                const review = docSnap.data();
                review.id = docSnap.id;

                const userDocRef = doc(chandriaDB, "userAccounts", review.uid);
                const userDocSnap = await getDoc(userDocRef);
                const userData = userDocSnap.exists() ? userDocSnap.data() : {};

                review.name = review.fullname || "Anonymous";
                review.initial = userData.fullname
                    ? userData.fullname.charAt(0)
                    : "U";
                review.profileImageUrl = userData.profileImageUrl || null;
                review.date = new Date(
                    review.createdAt.seconds * 1000
                ).toLocaleDateString();
                review.helpful = review.helpful || 0;
                review.tags = review.tags || [];
                review.category = "service";
                review.comment =
                    review.comment || review.text || "(No comment)";

                const reviewCard = this.createReviewCard(review);
                $reviewsContainer.append(reviewCard);
            }

            this.reviewsLoaded += snapshot.docs.length;

            // console.warn("LOAD DEBUG", {
            //     reviewsLoaded: this.reviewsLoaded,
            //     initialReviewsCount: this.initialReviewsCount,
            //     hasLoadedInitialReviews: this.hasLoadedInitialReviews,
            //     hasLoadedInitialBatch: this.hasLoadedInitialBatch,
            //     loadingReviews: this.loadingReviews
            // });

            this.updateSeeAllButton();
            this.animateNewCards();
        } catch (error) {
            console.error("Failed to load reviews:", error);
            notyf.error("Something went wrong while loading reviews.");
        } finally {
            this.loadingReviews = false; // ✅ Always reset flag
        }
    }

    //
    createReviewCard(review) {
        const card = document.createElement("div");
        card.className = "review-card";
        card.setAttribute("data-rating", review.rating);
        card.setAttribute("data-category", review.category || "general");
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";

        const stars = Array(5)
            .fill(0)
            .map(
                (_, index) =>
                    `<i class="fi fi-rs-star review-star ${
                        index < review.rating ? "filled" : ""
                    }"></i>`
            )
            .join("");

        const tags = review.tags
            .map(tag => `<span class="review-tag">${tag}</span>`)
            .join("");

        const avatarHTML = review.profileImageUrl
            ? `<img src="${review.profileImageUrl}" alt="Avatar" class="reviewer-img">`
            : `<span class="reviewer-initial">${review.initial}</span>`;

        card.innerHTML = `
        <div class="review-header">
            <div class="reviewer-info">
                <div class="reviewer-avatar">${avatarHTML}</div>
                <div class="reviewer-details">
                    <h4 class="reviewer-name">${review.name}</h4>
                    <div class="review-rating">${stars}</div>
                </div>
            </div>
            <span class="review-date">${review.date}</span>
        </div>
        <div class="review-content">
            <p class="review-text">"${review.comment}"</p>
            <div class="review-tags">${tags}</div>
        </div>
        <div class="review-bottom">
            <div class="review-divider"></div>
        </div>
    `;

        return card;
    }

    // Animate new cards in
    animateNewCards() {
        const allCards = document.querySelectorAll(".review-card");
        const newCards = Array.from(allCards).slice(-this.loadBatchSize); // Last batch of cards

        newCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, index * 100);
        });
    }

    // Update see all button
    updateSeeAllButton() {
        const seeAllBtn = document.querySelector(".see-all-reviews-btn");
        const remaining = this.totalReviews - this.reviewsLoaded;

        const desktopText = seeAllBtn.querySelector(".btn-text-desktop");
        const mobileText = seeAllBtn.querySelector(".btn-text-mobile");

        if (remaining <= 0) {
            if (desktopText) desktopText.textContent = "All Reviews Loaded";
            if (mobileText) mobileText.textContent = "All Loaded";
            seeAllBtn.disabled = true;
            seeAllBtn.style.opacity = "0.6";
            seeAllBtn.style.cursor = "not-allowed";
        } else {
            if (desktopText) desktopText.textContent = "Load More";
            if (mobileText) mobileText.textContent = "Load More";
            seeAllBtn.disabled = false;
            seeAllBtn.style.opacity = "1";
            seeAllBtn.style.cursor = "pointer";
        }

        // Only show if more than the first batch was loaded AND not first load
        if (this.reviewsLoaded > this.initialReviewsCount) {
            this.showCollapseButton();
        } else {
            this.hideCollapseButton();
        }
    }

    // Show collapse button
    showCollapseButton() {
        let collapseBtn = document.querySelector(".show-less-reviews-btn");

        if (!collapseBtn) {
            const reviewsActions = document.querySelector(".reviews-actions");
            collapseBtn = document.createElement("button");
            collapseBtn.className = "show-less-reviews-btn";
            collapseBtn.innerHTML = `Show Less`;

            collapseBtn.addEventListener("click", () => {
                this.collapseReviews();
            });

            reviewsActions.appendChild(collapseBtn);
        }
        // Show on both mobile and desktop when there are more reviews than initial
        collapseBtn.style.display = "inline-flex";
    }

    // Hide collapse button
    hideCollapseButton() {
        const collapseBtn = document.querySelector(".show-less-reviews-btn");
        if (collapseBtn) {
            collapseBtn.style.setProperty("display", "none", "important");
        }
    }

    // Collapse reviews back to original count
    collapseReviews() {
        const container = document.querySelector(".customer-reviews-grid");
        const allCards = container.querySelectorAll(".review-card");

        // Animate out the extra cards after the initial batch
        const cardsToRemove = Array.from(allCards).slice(
            this.initialReviewsCount
        );

        cardsToRemove.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = "0";
                card.style.transform = "translateY(-20px)";
            }, index * 50);
        });

        setTimeout(
            () => {
                // Actually remove the extra cards
                cardsToRemove.forEach(card => card.remove());

                // ✅ Reset internal state
                this.reviewsLoaded = this.initialReviewsCount;
                this.lastVisibleReviewDoc = this.lastInitialDoc || null; // 🔁 Resume from initial batch end
                this.loadingReviews = false; // Ensure not stuck
                this.hasLoadedInitialBatch = true; // Keep this true to avoid fetching the same batch

                // Update See All button
                const seeAllBtn = document.querySelector(
                    ".see-all-reviews-btn"
                );
                const desktopText =
                    seeAllBtn.querySelector(".btn-text-desktop");
                const mobileText = seeAllBtn.querySelector(".btn-text-mobile");

                if (desktopText) desktopText.textContent = "Load More";
                if (mobileText) mobileText.textContent = "Load More";

                seeAllBtn.disabled = false;
                seeAllBtn.style.opacity = "1";
                seeAllBtn.style.cursor = "pointer";

                // Hide collapse button
                this.hideCollapseButton();

                // Smooth scroll to filter or fallback to reviews section
                const filterSection = document.querySelector(
                    ".reviews-filter-section"
                );
                if (filterSection) {
                    filterSection.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                } else {
                    document.querySelector("#reviews").scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            },
            cardsToRemove.length * 50 + 200
        );
    }
    //
}

// Animation for rating bars on scroll
function animateRatingBars() {
    const ratingBars = document.querySelectorAll(".rating-fill");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const width = bar.style.width;
                    bar.style.width = "0%";

                    setTimeout(() => {
                        bar.style.width = width;
                    }, 100);
                }
            });
        },
        { threshold: 0.5 }
    );

    ratingBars.forEach(bar => observer.observe(bar));
}

// function renderStarRating(rating) {
//     let stars = "";
//     for (let i = 1; i <= 5; i++) {
//         stars += `<i class="fi fi-rs-star review-star${
//             i <= rating ? " filled" : ""
//         }"></i>`;
//     }
//     return stars;
// }

// function formatTimeAgo(date) {
//     if (!date || !date.toDate) return "Unknown";
//     const now = new Date();
//     const reviewDate = date.toDate();
//     const diff = Math.floor((now - reviewDate) / 1000);

//     const units = [
//         { label: "year", seconds: 31536000 },
//         { label: "month", seconds: 2592000 },
//         { label: "week", seconds: 604800 },
//         { label: "day", seconds: 86400 },
//         { label: "hour", seconds: 3600 },
//         { label: "minute", seconds: 60 },
//         { label: "second", seconds: 1 }
//     ];

//     for (const unit of units) {
//         const count = Math.floor(diff / unit.seconds);
//         if (count >= 1) {
//             return `${count} ${unit.label}${count > 1 ? "s" : ""} ago`;
//         }
//     }
//     return "Just now";
// }

// async function loadCustomerReviews() {
//     const $reviewsContainer = $("#customer-reviews-container");
//     $reviewsContainer.empty(); // Clear existing content

//     try {
//         const reviewsRef = collection(chandriaDB, "shopReviews");
//         const q = query(reviewsRef, orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);

//         querySnapshot.forEach(doc => {
//             const data = doc.data();

//             const fullname = data.fullname || "Anonymous";
//             const initials = fullname.charAt(0).toUpperCase();
//             const profileImage = data.profileImageUrl || "";

//             const starsHTML = renderStarRating(data.rating);
//             const tagsHTML = (data.tags || [])
//                 .map(tag => `<span class="review-tag">${tag}</span>`)
//                 .join("");

//             const $reviewCard = $(`
//                 <div class="review-card" data-rating="${data.rating}">
//                     <div class="review-header">
//                         <div class="reviewer-info">

//                           <div class="reviewer-avatar">
//                               ${
//                                   profileImage
//                                       ? `<img src="${profileImage}" alt="${fullname}'s Profile" class="reviewer-img" />`
//                                       : `<span class="reviewer-initial">${initials}</span>`
//                               }
//                           </div>

//                             <div class="reviewer-details">
//                                 <h4 class="reviewer-name">${data.fullname}</h4>
//                                 <div class="review-rating">${starsHTML}</div>
//                             </div>
//                         </div>
//                         <span class="review-date">${formatTimeAgo(
//                             data.createdAt
//                         )}</span>
//                     </div>
//                     <div class="review-content">
//                         <p class="review-text">"${data.text}"</p>
//                         <div class="review-tags">${tagsHTML}</div>
//                     </div>
//                     <div class="review-bottom">
//                         <div class="review-divider"></div>
//                     </div>
//                 </div>
//             `);

//             $reviewsContainer.append($reviewCard);
//         });
//     } catch (error) {
//         console.error("Error loading reviews:", error);
//     }
// }

async function updateReviewsOverview() {
    const reviewsRef = collection(chandriaDB, "shopReviews");

    try {
        const snapshot = await getDocs(reviewsRef);

        let totalReviews = 0;
        let totalRating = 0;
        const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        snapshot.forEach(doc => {
            const data = doc.data();
            const rating = Number(data.rating); // Ensure numeric

            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                totalReviews++;
                totalRating += rating;
                starCounts[rating]++;
            }
        });

        const averageRating =
            totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "0.0";

        // Update DOM
        $(".reviews-rating-number").text(averageRating);
        $(".reviews-total-count").text(`Based on ${totalReviews} reviews`);

        // Update star icons (rounded)
        const starContainer = $(".reviews-rating-stars");
        starContainer.empty();

        const roundedRating = Math.round(averageRating);
        for (let i = 1; i <= 5; i++) {
            const isFilled = i <= roundedRating;
            const starClass = isFilled ? "filled" : "";
            starContainer.append(
                `<i class="fi fi-rs-star review-star ${starClass}"></i>`
            );
        }

        // Update each rating bar and count using data-star attributes
        for (let star = 5; star >= 1; star--) {
            const count = starCounts[star];
            const percent = totalReviews ? (count / totalReviews) * 100 : 0;

            const bar = $(`.rating-bar-item[data-star='${star}'] .rating-fill`);
            const label = $(
                `.rating-bar-item[data-star='${star}'] .rating-count`
            );

            bar.css("width", `${percent}%`);
            label.text(count);
        }
    } catch (error) {
        console.error("Failed to load reviews overview:", error);
    }
}

// Initialize everything when DOM is loaded
$(document).ready(function () {
    // Initialize reviews manager and make it globally accessible
    window.reviewsController = new ReviewsManager();

    // Initialize rating bar animations
    animateRatingBars();

    // Add smooth scrolling to reviews section if linked from navigation
    $('a[href="#reviews"]').on("click", function (e) {
        e.preventDefault();
        $("#reviews")[0].scrollIntoView({
            behavior: "smooth"
        });
    });

    // Load first batch of reviews only
    window.reviewsController.loadMoreReviews();

    updateReviewsOverview();

    // Submit review and reload reviews
    $(".review-modal-btn-submit").on("click", function (e) {
        e.preventDefault();
        window.reviewsController.submitReview().then(() => {
            // After successful submission, reload reviews
            window.reviewsController.reviewsLoaded = 0;
            window.reviewsController.lastVisibleReviewDoc = null;
            $(".customer-reviews-grid").empty();
            window.reviewsController.loadMoreReviews();

            updateReviewsOverview();
        });
    });

    // Handle Write a Review button (check auth)
    $(".write-review-btn").on("click", function () {
        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
        } else {
            console.log("User is logged in. Show review form.");
        }
    });

    // Load more reviews when "See All" is clicked
    $(".see-all-reviews-btn").on("click", function () {
        window.reviewsController.loadMoreReviews();
    });
});

// Export for potential use in other scripts
if (typeof module !== "undefined" && module.exports) {
    module.exports = ReviewsManager;
}
