(function() {
    // Use absolute base path for external deployment
    console.log("embed loaded");
    const basePath = 'https://lf2foce.github.io/deman-embed';

    // Create a container for the chat widget
    const chatContainer = document.createElement('div');
    chatContainer.id = 'oniiz-chat-widget-container';
    document.body.appendChild(chatContainer);

    // Style the container
    chatContainer.style.position = 'fixed';
    chatContainer.style.bottom = '20px';
    chatContainer.style.right = '20px';
    chatContainer.style.zIndex = '9999';

    // Create the chat button
    const chatButton = document.createElement('button');
    chatButton.id = 'oniiz-chat-button';
    chatButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    chatContainer.appendChild(chatButton);

    // Style the chat button with mobile optimizations
    chatButton.style.width = '60px';
    chatButton.style.height = '60px';
    chatButton.style.minWidth = '60px';
    chatButton.style.minHeight = '60px';
    chatButton.style.borderRadius = '50%';
    chatButton.style.backgroundColor = '#7f56d9';
    chatButton.style.color = 'white';
    chatButton.style.border = 'none';
    chatButton.style.cursor = 'pointer';
    chatButton.style.display = 'flex';
    chatButton.style.alignItems = 'center';
    chatButton.style.justifyContent = 'center';
    chatButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    chatButton.style.transition = 'transform 0.2s';
    chatButton.style.webkitTapHighlightColor = 'transparent';
    chatButton.style.touchAction = 'manipulation';
    chatButton.style.userSelect = 'none';
    chatButton.style.webkitUserSelect = 'none';
    
    // Add hover/active states for better feedback
    chatButton.addEventListener('mousedown', () => {
        chatButton.style.transform = 'scale(0.95)';
    });
    
    chatButton.addEventListener('mouseup', () => {
        chatButton.style.transform = 'scale(1)';
    });
    
    chatButton.addEventListener('mouseleave', () => {
        chatButton.style.transform = 'scale(1)';
    });
    
    // Touch events for mobile
    chatButton.addEventListener('touchstart', () => {
        chatButton.style.transform = 'scale(0.95)';
    });
    
    chatButton.addEventListener('touchend', () => {
        chatButton.style.transform = 'scale(1)';
    });

    // Create the iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'oniiz-chat-iframe';
    iframe.src = `${basePath}/chat_widget/index.html`;
    iframe.style.width = '400px';
    iframe.style.height = '550px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '10px';
    iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    iframe.style.display = 'none'; // Initially hidden
    iframe.style.transition = 'opacity 0.3s, transform 0.3s';
    iframe.style.opacity = '0';
    iframe.style.transform = 'translateY(20px)';
    chatContainer.appendChild(iframe);

    let isOpen = false;

    // Function to open chat
    function openChat() {
        isOpen = true;
        
        // Check viewport width for responsive behavior
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (viewportWidth <= 768) {
            // Small viewport: Make iframe full viewport with safe areas
            iframe.style.position = 'fixed';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.style.width = '100vw';
            iframe.style.height = '100vh';
            iframe.style.height = '100dvh'; // Dynamic viewport height
            iframe.style.borderRadius = '0';
            iframe.style.zIndex = '999999';
            
            // Prevent body scroll when chat is open on mobile
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        } else {
            // Large viewport: Keep original size but improve positioning
            iframe.style.position = 'fixed';
            iframe.style.bottom = '80px';
            iframe.style.right = '20px';
            iframe.style.top = 'auto';
            iframe.style.left = 'auto';
            iframe.style.width = '400px';
            iframe.style.height = '550px';
            iframe.style.maxHeight = `${viewportHeight - 100}px`;
            iframe.style.borderRadius = '10px';
            iframe.style.zIndex = '999999';
        }
        
        iframe.style.display = 'block';
        chatButton.style.display = 'none'; // Hide chat button when widget is open
        
        setTimeout(() => {
            iframe.style.opacity = '1';
            iframe.style.transform = 'translateY(0)';
        }, 10);
    }

    // Function to close chat
    function closeChat() {
        isOpen = false;
        
        iframe.style.opacity = '0';
        iframe.style.transform = 'translateY(20px)';
        
        // Restore body scroll on mobile
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        
        setTimeout(() => {
            iframe.style.display = 'none';
            chatButton.style.display = 'flex'; // Show chat button again when widget is closed
        }, 300);
    }

    // Toggle chat visibility
    chatButton.addEventListener('click', () => {
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    });

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
        if (event.data === 'closeChat') {
            closeChat();
        }
    });
    
    // Handle window resize when chat is open
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (isOpen) {
            // Debounce resize events
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                if (viewportWidth <= 768) {
                    // Small viewport: Make iframe full viewport
                    iframe.style.position = 'fixed';
                    iframe.style.top = '0';
                    iframe.style.left = '0';
                    iframe.style.width = '100vw';
                    iframe.style.height = '100vh';
                    iframe.style.height = '100dvh';
                    iframe.style.borderRadius = '0';
                    iframe.style.zIndex = '999999';
                } else {
                    // Large viewport: Keep original size
                    iframe.style.position = 'fixed';
                    iframe.style.bottom = '80px';
                    iframe.style.right = '20px';
                    iframe.style.top = 'auto';
                    iframe.style.left = 'auto';
                    iframe.style.width = '400px';
                    iframe.style.height = '550px';
                    iframe.style.maxHeight = `${viewportHeight - 100}px`;
                    iframe.style.borderRadius = '10px';
                    iframe.style.zIndex = '999999';
                    
                    // Restore body scroll
                    document.body.style.overflow = '';
                    document.body.style.position = '';
                    document.body.style.width = '';
                    document.body.style.height = '';
                }
            }, 100);
        }
    });
})();
