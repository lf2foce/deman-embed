class ChatApp {
    constructor() {
        this.sessionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        this.isLoading = false;
        this.currentThinkingBubble = null;
        this.isMobile = this.detectMobile();
        this.isKeyboardOpen = false;
        
        this.messagesList = document.getElementById('messagesList');
        this.messagesScroll = document.getElementById('messagesScroll');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        
        this.init();
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    init() {
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.sendBtn.addEventListener('click', () => {
            if (!this.isLoading) {
                this.sendMessage();
            }
        });
        
        // Enhanced touch support for send button
        if (this.isMobile) {
            this.sendBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.sendBtn.style.transform = 'scale(0.95)';
            });
            
            this.sendBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.sendBtn.style.transform = 'scale(1)';
                if (!this.isLoading) {
                    this.sendMessage();
                }
            });
        }
        
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.chatInput.value = btn.textContent;
                this.sendMessage();
            });
            
            // Enhanced touch support for suggestion buttons
            if (this.isMobile) {
                btn.addEventListener('touchstart', (e) => {
                    btn.style.transform = 'scale(0.95)';
                });
                
                btn.addEventListener('touchend', (e) => {
                    btn.style.transform = 'scale(1)';
                });
            }
        });
        
        // Mobile keyboard handling
        if (this.isMobile) {
            this.setupMobileKeyboardHandling();
        }
        
        // Smart auto focus - avoid on mobile to prevent unwanted keyboard
        setTimeout(() => {
            if (!this.isLoading && !this.isMobile) {
                this.chatInput.focus();
            }
        }, 100);
        
        // Prevent zoom on double tap
        if (this.isMobile) {
            document.addEventListener('touchstart', this.preventZoom.bind(this));
        }
    }
    
    setupMobileKeyboardHandling() {
        const initialViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        
        this.chatInput.addEventListener('focus', () => {
            this.isKeyboardOpen = true;
            setTimeout(() => {
                this.scrollToBottom(true);
            }, 300);
        });
        
        this.chatInput.addEventListener('blur', () => {
            this.isKeyboardOpen = false;
        });
        
        // Handle viewport changes for virtual keyboard
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                const currentHeight = window.visualViewport.height;
                const heightDiff = initialViewportHeight - currentHeight;
                
                if (heightDiff > 150) { // Keyboard is likely open
                    this.isKeyboardOpen = true;
                    setTimeout(() => {
                        this.scrollToBottom(true);
                    }, 100);
                } else {
                    this.isKeyboardOpen = false;
                }
            });
        }
    }
    
    preventZoom(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
        
        let lastTouchEnd = 0;
        if (e.type === 'touchend') {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        this.isLoading = true;
        this.sendBtn.disabled = true;
        this.chatInput.disabled = true;
        
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.showThinkingBubble();
        
        try {
            await this.streamResponse(message);
        } catch (error) {
            console.error('Error:', error);
            this.hideThinkingBubble();
            this.addMessage('❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.', 'assistant');
        } finally {
            this.isLoading = false;
            this.sendBtn.disabled = false;
            this.chatInput.disabled = false;
            // Smart focus - only focus on desktop or when explicitly requested on mobile
            if (!this.isMobile) {
                this.chatInput.focus();
            }
        }
    }
    
    async streamResponse(message) {
        const response = await fetch('https://deman-agent.onrender.com/api/py/chat-faiss-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': this.sessionId
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = null;
        let content = '';
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'chunk') {
                            if (!assistantMessage) {
                                this.hideThinkingBubble();
                                assistantMessage = this.addMessage('', 'assistant');
                                content = '';
                            }
                            content += data.content || '';
                            this.updateMessage(assistantMessage, content);
                        } else if (data.type === 'suggestions' || data.type === 'smart_suggestions') {
                            // Handle streaming suggestions from backend
                            console.log('Received suggestions:', data.suggestions);
                            if (data.suggestions && data.suggestions.length > 0) {
                                this.updateSuggestions(data.suggestions);
                            }
                        } else if (data.type === 'error' || data.type === 'workflow_error') {
                            this.hideThinkingBubble();
                            this.addMessage('❌ Lỗi: ' + (data.error || data.message || 'Đã xảy ra lỗi'), 'assistant');
                            break;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }
    }
    
    addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `avatar ${role === 'user' ? 'user' : 'bot'}`;
        
        const iconSvg = role === 'user' 
            ? '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
            : '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>';
        
        avatarDiv.innerHTML = iconSvg;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text markdown-content';
        textDiv.innerHTML = this.formatMessage(content);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timeDiv);
        
        if (role === 'user') {
            messageDiv.appendChild(contentDiv);
            messageDiv.appendChild(avatarDiv);
        } else {
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
        }
        
        this.messagesList.appendChild(messageDiv);
        
        if (role === 'user' || content.trim() !== '') {
            this.scrollToBottom();
        }
        
        return textDiv;
    }
    
    updateMessage(messageElement, content) {
        messageElement.innerHTML = this.formatMessage(content);
        this.scrollToBottom();
    }
    
    formatMessage(content) {
        let formatted = content;
        
        // Parse markdown images ![alt](url) and wrap consecutive images in container
        formatted = formatted.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" onclick="openImageModal(this)" />');
        
        // Wrap consecutive images in image-container
        formatted = formatted.replace(/(<img[^>]*>\s*)+/g, (match) => {
            return `<div class="image-container">${match}</div>`;
        });
        
        // Parse basic markdown
        formatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Parse tables (simple HTML table detection)
        if (formatted.includes('<table>') || formatted.includes('<tr>') || formatted.includes('<td>')) {
            // Content already contains HTML table, keep as is
        } else {
            // Convert line breaks
            formatted = formatted.replace(/\n/g, '<br>');
        }
        
        return formatted;
    }
    
    showThinkingBubble() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-bubble';
        thinkingDiv.innerHTML = `
            <div class="avatar bot">
                <svg class="icon icon-sm" viewBox="0 0 24 24">
                    <path d="M12 8V4H8"></path>
                    <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                    <path d="M2 14h2"></path>
                    <path d="M20 14h2"></path>
                    <path d="M15 13v2"></path>
                    <path d="M9 13v2"></path>
                </svg>
            </div>
            <div class="thinking-content">
                <span>Đang xử lý</span>
                <div class="thinking-dots">
                    <div class="thinking-dot"></div>
                    <div class="thinking-dot"></div>
                    <div class="thinking-dot"></div>
                </div>
            </div>
        `;
        
        this.currentThinkingBubble = thinkingDiv;
        this.messagesList.appendChild(thinkingDiv);
        this.scrollToBottom();
    }
    
    hideThinkingBubble() {
        if (this.currentThinkingBubble) {
            this.currentThinkingBubble.remove();
            this.currentThinkingBubble = null;
        }
    }
    
    scrollToBottom(force = false) {
        const scrollDelay = this.isMobile && this.isKeyboardOpen ? 300 : 100;
        
        setTimeout(() => {
            if (force || !this.isKeyboardOpen || !this.isMobile) {
                this.messagesScroll.scrollTo({
                    top: this.messagesScroll.scrollHeight,
                    behavior: this.isMobile ? 'smooth' : 'auto'
                });
            }
        }, scrollDelay);
    }
    
    updateSuggestions(suggestions) {
        // Update suggestion buttons with new suggestions from backend
        const suggestionsList = document.querySelector('.suggestions-list');
        if (suggestionsList && suggestions && suggestions.length > 0) {
            // Clear existing suggestions
            suggestionsList.innerHTML = '';
            
            // Add new suggestions
            suggestions.forEach(suggestion => {
                const button = document.createElement('button');
                button.className = 'suggestion-btn';
                button.textContent = suggestion;
                button.addEventListener('click', () => {
                    this.chatInput.value = suggestion;
                    this.sendMessage();
                });
                suggestionsList.appendChild(button);
            });
        }
    }
}

// Image modal functions
function openImageModal(img) {
    const modal = document.getElementById('imageModal') || createImageModal();
    const modalImg = modal.querySelector('.modal-content');
    modal.classList.add('show');
    modalImg.src = img.src;
    modalImg.alt = img.alt;
}

function createImageModal() {
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <span class="close-modal" onclick="closeImageModal()">&times;</span>
        <img class="modal-content" />
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking outside the image
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    return modal;
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeImageModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});