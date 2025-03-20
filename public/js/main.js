document.addEventListener('DOMContentLoaded', () => {
  // Form elements
  const imageForm = document.getElementById('imageForm');
  const promptInput = document.getElementById('prompt');
  const generateBtn = document.getElementById('generateBtn');
  
  // Result elements
  const loadingIndicator = document.getElementById('loadingIndicator');
  const imageResult = document.getElementById('imageResult');
  const initialState = document.getElementById('initialState');
  const generatedImage = document.getElementById('generatedImage');
  const enhancedPromptElement = document.getElementById('enhancedPrompt');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  
  // Option buttons
  const optionButtons = document.querySelectorAll('.option-btn');
  
  // Selected options (with defaults)
  const selectedOptions = {
    imageType: 'photos',
    style: 'minimalistic',
    purpose: 'presentations',
    aspectRatio: '1:1',
    steps: 4  // Default to maximum allowed steps for best quality
  };
  
  // Add focus animation to prompt input
  promptInput.addEventListener('focus', () => {
    promptInput.parentElement.classList.add('focused');
  });
  
  promptInput.addEventListener('blur', () => {
    promptInput.parentElement.classList.remove('focused');
  });
  
  // Set up option button click handlers with animation
  optionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-type');
      const value = button.getAttribute('data-value');
      
      // Remove active class from all buttons of this type
      document.querySelectorAll(`.option-btn[data-type="${type}"]`).forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button with a small animation
      button.classList.add('active');
      button.classList.add('pulse');
      setTimeout(() => {
        button.classList.remove('pulse');
      }, 300);
      
      // Update selected options
      selectedOptions[type] = value;
    });
  });
  
  // Form submission handler
  imageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const prompt = promptInput.value.trim();
    if (!prompt) {
      showToast('Please enter a prompt to generate an image.');
      promptInput.focus();
      return;
    }
    
    // Show loading state
    initialState.classList.add('hidden');
    imageResult.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="btn-spinner"></div> Generating...';
    
    try {
      // Prepare data for API request
      const requestData = {
        prompt,
        ...selectedOptions
      };
      
      // Send request to server
      const response = await fetch('/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      
      // Display the generated image
      if (data.isUrl) {
        // If we received a URL
        generatedImage.src = data.imageData;
      } else {
        // If we received base64 data
        generatedImage.src = `data:image/png;base64,${data.imageData}`;
      }
      enhancedPromptElement.textContent = data.enhancedPrompt;
      
      // Show image result with animation
      loadingIndicator.classList.add('hidden');
      imageResult.classList.remove('hidden');
      imageResult.classList.add('fade-in');
      setTimeout(() => {
        imageResult.classList.remove('fade-in');
      }, 500);
      
      // Set up download button
      downloadBtn.onclick = () => {
        if (data.isUrl) {
          // For URL-based images, open in a new tab for saving
          window.open(data.imageData, '_blank');
        } else {
          // For base64 images, create a download link
          const link = document.createElement('a');
          link.href = `data:image/png;base64,${data.imageData}`;
          link.download = `business-image-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        showToast('Image downloaded successfully!');
      };
      
      // Set up copy prompt button
      copyPromptBtn.onclick = () => {
        navigator.clipboard.writeText(data.enhancedPrompt)
          .then(() => {
            showToast('Prompt copied to clipboard!');
          })
          .catch(err => {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy prompt');
          });
      };
      
      // Add edit button to the action buttons
      const actionButtons = document.querySelector('.action-buttons');
      
      // Remove existing edit button if any
      const existingEditBtn = document.getElementById('editBtn');
      if (existingEditBtn) {
        existingEditBtn.remove();
      }
      
      // Create and add the edit button
      const editBtn = document.createElement('button');
      editBtn.id = 'editBtn';
      editBtn.className = 'action-btn';
      editBtn.innerHTML = `
        <span class="btn-icon"><i class="fas fa-edit"></i></span>
        Edit Image
      `;
      
      // Add click handler for edit button
      editBtn.addEventListener('click', () => {
        // Prepare image data for URL parameter
        const imageToEdit = data.isUrl 
          ? encodeURIComponent(data.imageData)
          : encodeURIComponent(data.imageData);
        
        // Navigate to editor page with image data
        window.location.href = `/editor?imageData=${imageToEdit}&isUrl=${data.isUrl}`;
      });
      
      // Add the edit button to action buttons
      actionButtons.appendChild(editBtn);
      
    } catch (error) {
      console.error('Error:', error);
      showToast(`Error: ${error.message || 'Failed to generate image'}`);
    } finally {
      // Reset button state
      loadingIndicator.classList.add('hidden');
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span class="btn-icon">✨</span> Generate Image';
      
      // If no image was generated, show initial state
      if (imageResult.classList.contains('hidden')) {
        initialState.classList.remove('hidden');
      }
    }
  });
  
  // Toast notification function
  function showToast(message, duration = 3000) {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add toast to the document
    document.body.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Hide and remove the toast after the specified duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
  
  // Add keyboard shortcut for form submission (Ctrl+Enter)
  promptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      imageForm.dispatchEvent(new Event('submit'));
    }
  });
});
