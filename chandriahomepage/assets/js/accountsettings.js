function previewImage(event) {
    const input = event.target;
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            // Create an image element and set its source
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            
            // Clear the placeholder and add the image
            avatarPlaceholder.innerHTML = '';
            avatarPlaceholder.appendChild(img);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function confirmDelete() {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        alert("Account deletion process would be initiated on the back-end.");
        // Trigger API call here in production
    }
}

// Toggle password fields visibility
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('togglePasswordFields');
    const passwordFields = document.getElementById('passwordFields');
    
    toggleButton.addEventListener('click', function() {
        if (passwordFields.style.display === 'none') {
            passwordFields.style.display = 'block';
            toggleButton.textContent = 'Cancel Password Change';
        } else {
            passwordFields.style.display = 'none';
            toggleButton.textContent = 'Change Password';
            
            // Clear password fields when hiding
            document.getElementById('password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
        }
    });
});
