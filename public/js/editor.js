document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatContainer = document.getElementById('chatContainer');
  const editedImage = document.getElementById('editedImage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const imageResult = document.getElementById('imageResult');
  const downloadBtn = document.getElementById('downloadBtn');
  const backBtn = document.getElementById('backBtn');
  
  // Get image data from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const imageData = urlParams.get('imageData');
  const isUrl = urlParams.get('isUrl') === 'true';
  
  // Chat history for the session
  let chatHistory = [];
  let currentImageSrc = '';
  
  // Initialize the page
  function init() {
    // Set the image
    if (imageData) {
      if (isUrl) {
        editedImage.src = decodeURIComponent(imageData);
      } else {
        editedImage.src = `data:image/png;base64,${decodeURIComponent(imageData)}`;
      }
      currentImageSrc = editedImage.src;
    } else {
      // If no image data, redirect back to the main page
      window.location.href = '/';
    }
    
    // Set up the back button
    backBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
    
    // Set up download button
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = editedImage.src;
      link.download = `edited-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Image downloaded successfully!');
    });
    
    // Add welcome message
    addSystemMessage('I can help you edit this image. Describe what changes you would like to make.');
  }
  
  // Handle form submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    chatInput.value = '';
    
    // Show typing indicator
    const typingIndicator = addTypingIndicator();
    
    try {
      // Get current image data
      let currentImageData;
      
      if (currentImageSrc.startsWith('data:')) {
        // For base64 data, extract just the base64 part
        currentImageData = currentImageSrc.split(',')[1];
      } else {
        // For URLs, use the URL directly
        currentImageData = currentImageSrc;
      }
      
      // Show loading state
      loadingIndicator.classList.remove('hidden');
      
      // Send request to server
      const response = await fetch('/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: currentImageData,
          prompt: message,
          isBase64: currentImageSrc.startsWith('data:')
        })
      });
      
      // Check if the response is valid JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. The payload might be too large.');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit image');
      }
      
      // Remove typing indicator
      if (typingIndicator) {
        typingIndicator.remove();
      }
      
      // Add AI response to chat
      addAIMessage(data.response);
      
      // Update image if the response contains image data
      if (data.editedImageData) {
        editedImage.src = `data:image/png;base64,${data.editedImageData}`;
        currentImageSrc = editedImage.src;
        
        // Add a system message about the successful edit
        addSystemMessage('Image has been edited successfully! You can continue making changes or download the result.');
      } else {
        // If no image data was returned
        addSystemMessage('The AI could not generate an edited image based on your instructions. Please try a different prompt.');
      }
      
    } catch (error) {
      console.error('Error:', error);
      
      // Remove typing indicator
      if (typingIndicator) {
        typingIndicator.remove();
      }
      
      // Add error message
      addSystemMessage(`Error: ${error.message || 'Failed to edit image'}`);
      showToast(`Error: ${error.message || 'Failed to edit image'}`);
    } finally {
      // Hide loading indicator
      loadingIndicator.classList.add('hidden');
    }
  });
  
  // Add a user message to the chat
  function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message user-message';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div class="message-content">${escapeHtml(message)}</div>
      <div class="message-time">${time}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    scrollToBottom();
    
    // Add to chat history
    chatHistory.push({ role: 'user', message });
  }
  
  // Add an AI message to the chat
  function addAIMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message ai-message';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div class="message-content">${formatMessage(message)}</div>
      <div class="message-time">${time}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    scrollToBottom();
    
    // Add to chat history
    chatHistory.push({ role: 'assistant', message });
  }
  
  // Add a system message to the chat
  function addSystemMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    
    messageElement.innerHTML = `
      <div class="message-content">${message}</div>
    `;
    
    chatContainer.appendChild(messageElement);
    scrollToBottom();
  }
  
  // Add typing indicator
  function addTypingIndicator() {
    const typingElement = document.createElement('div');
    typingElement.className = 'typing-indicator';
    typingElement.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    
    chatContainer.appendChild(typingElement);
    scrollToBottom();
    
    return typingElement;
  }
  
  // Format message with markdown-like syntax
  function formatMessage(message) {
    // Replace newlines with <br>
    let formatted = message.replace(/\n/g, '<br>');
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Check for base64 image data in the response and remove it to avoid displaying it in the chat
    formatted = formatted.replace(/data:image\/[^;]+;base64,[^"'\s]+/g, '[Image data]');
    
    return formatted;
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Scroll chat to bottom
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
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
  chatInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      chatForm.dispatchEvent(new Event('submit'));
    }
  });
  
  // Initialize the page
  init();
});
