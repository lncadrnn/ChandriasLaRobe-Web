// Fix for modal handling issues
document.addEventListener('DOMContentLoaded', function() {    // Fix modal CSS visibility issues
    function enhanceModals() {
        // Ensure consistent modal styles
        const modalStyleEl = document.createElement('style');
        modalStyleEl.textContent = `
            /* Consistent modal styling */
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                visibility: hidden;
                opacity: 0;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .modal.visible,
            .modal.show {
                visibility: visible;
                opacity: 1;
            }
            
            /* Error Modal specific styles */
            .error-modal-content {
                background: white;
                border-radius: var(--border-radius-lg);
                box-shadow: var(--shadow-large);
                max-width: 450px;
                width: 90%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                position: relative;
                animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .error-modal-header {
                background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                color: white;
                padding: 1.25rem 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
            }
            
            .error-modal-body {
                padding: 1.5rem;
                font-size: 1rem;
                color: var(--text-color-dark);
                text-align: center;
            }
            
            .error-modal-actions {
                padding: 1rem 1.5rem 1.5rem;
                display: flex;
                justify-content: center;
            }
            
            /* Confirm Modal specific styles */
            .confirm-modal-content {
                background: white;
                border-radius: var(--border-radius-lg);
                box-shadow: var(--shadow-large);
                max-width: 450px;
                width: 90%;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                position: relative;
                animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .confirm-modal-header {
                background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
                color: white;
                padding: 1.25rem 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
            }
            
            .confirm-modal-body {
                padding: 1.5rem;
                font-size: 1rem;
                color: var(--text-color-dark);
                text-align: center;
            }
            
            .confirm-modal-actions {
                padding: 1rem 1.5rem 1.5rem;
                display: flex;
                justify-content: space-between;
                gap: 1rem;
            }
        `;
        document.head.appendChild(modalStyleEl);

        // Better error modal handling
        const showErrorModalOriginal = window.showErrorModal;
        window.showErrorModal = function(message) {
            const modal = document.getElementById("error-modal");
            if (!modal) return;
            
            const msg = document.getElementById("error-modal-message");
            if (msg) msg.textContent = message;
            
            modal.classList.add("show");
            modal.classList.add("visible");
            modal.style.display = "flex";
            document.body.style.overflow = "hidden";
        };

        // Error modal close handlers
        $(document).on("click", ".error-close, #error-modal-ok", function() {
            $("#error-modal").removeClass("show");
            $("#error-modal").removeClass("visible");
            $("#error-modal").css("display", "none");
            document.body.style.overflow = "auto";
        });

        $(document).on("click", "#error-modal", function(e) {
            if (e.target === this) {
                $(this).removeClass("show");
                $(this).removeClass("visible");
                $(this).css("display", "none");
                document.body.style.overflow = "auto";
            }
        });

        // Better confirm modal handling with proper cleanup
        window.showConfirmModal = function(message, onConfirm) {
            const modal = document.getElementById("confirm-modal");
            if (!modal) return;
            
            const msg = document.getElementById("confirm-modal-message");
            if (msg) msg.textContent = message;
            
            // Set a modal state attribute to track this specific modal instance
            const modalInstanceId = Date.now();
            modal.setAttribute('data-instance-id', modalInstanceId);
            
            modal.classList.add("show");
            modal.classList.add("visible");
            modal.style.display = "flex";
            document.body.style.overflow = "hidden";
            
            // Remove previous listeners if any by using event delegation
            const okBtn = document.getElementById("confirm-modal-ok");
            const cancelBtn = document.getElementById("confirm-modal-cancel");
            const closeBtn = document.querySelector(".confirm-close");
            
            // Cleanup function that preserves the callback
            function cleanup(runCallback = false) {
                // Only cleanup if this is still the current modal instance
                if (modal.getAttribute('data-instance-id') != modalInstanceId) {
                    return; // Skip cleanup if another modal has been opened
                }
                
                modal.classList.remove("show");
                modal.classList.remove("visible");
                modal.style.display = "none";
                document.body.style.overflow = "auto";
                
                // Run the callback if requested
                if (runCallback && onConfirm) {
                    // Execute callback in next tick to avoid potential race conditions
                    setTimeout(() => {
                        onConfirm();
                    }, 0);
                }
            }
            
            // Use one-time event listeners with proper cleanup
            function handleConfirm() {
                cleanup(true); // Run with callback
            }
            
            function handleCancel() {
                cleanup(false); // Run without callback
            }
            
            function handleBackdropClick(e) {
                if (e.target === modal) {
                    cleanup(false);
                }
            }
            
            // Remove existing listeners to prevent duplicates
            if (okBtn) {
                okBtn.replaceWith(okBtn.cloneNode(true));
                const newOkBtn = document.getElementById("confirm-modal-ok");
                newOkBtn.addEventListener("click", handleConfirm);
            }
            
            if (cancelBtn) {
                cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                const newCancelBtn = document.getElementById("confirm-modal-cancel");
                newCancelBtn.addEventListener("click", handleCancel);
            }
            
            if (closeBtn) {
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                const newCloseBtn = document.querySelector(".confirm-close");
                newCloseBtn.addEventListener("click", handleCancel);
            }
            
            // Handle backdrop click
            modal.removeEventListener("click", handleBackdropClick);
            modal.addEventListener("click", handleBackdropClick);
        };
    }    // Improve action button hover states
    function fixActionButtonHoverStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Force isolation of action button hover effects */
            .product-actions .action-btn {
                background-color: white !important;
                color: var(--text-color) !important;
                border: 1px solid var(--border-color) !important;
            }
            
            /* Override any general hover that might affect multiple buttons */
            .product-actions .action-btn:hover:not(.edit-btn):not(.delete-btn) {
                background-color: white !important;
                color: var(--text-color) !important;
                border: 1px solid var(--border-color) !important;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Call the enhancement functions
    enhanceModals();
    fixActionButtonHoverStyles();
});
