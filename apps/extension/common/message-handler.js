// ═══════════════════════════════════════════════════════════
// 📨 MESSAGE HANDLER REGISTRY
// Centralized message handling with middleware support
// ═══════════════════════════════════════════════════════════

const MessageHandler = (() => {
  const handlers = new Map();
  const middlewares = [];
  
  // ═══════════════════════════════════════════════════════════
  // 🔧 HANDLER REGISTRATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Register a message handler
   * @param {string} action - Action name
   * @param {Function} handler - Handler function (request, sender) => response
   * @param {Object} options - Handler options
   */
  function register(action, handler, options = {}) {
    const config = {
      requiresAuth: true,
      async: true,
      ...options
    };
    
    handlers.set(action, { handler, config });
    console.log(`📨 Handler registered: ${action}`);
  }

  /**
   * Register multiple handlers at once
   * @param {Object} handlerMap - { action: handler } or { action: { handler, options } }
   */
  function registerAll(handlerMap) {
    for (const [action, value] of Object.entries(handlerMap)) {
      if (typeof value === 'function') {
        register(action, value);
      } else {
        register(action, value.handler, value.options);
      }
    }
  }

  /**
   * Add middleware that runs before handlers
   * @param {Function} middleware - (request, sender, next) => response
   */
  function use(middleware) {
    middlewares.push(middleware);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔄 MESSAGE PROCESSING
  // ═══════════════════════════════════════════════════════════

  /**
   * Process an incoming message
   * @param {Object} request - Message request
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response callback
   * @returns {boolean} True if async response expected
   */
  function process(request, sender, sendResponse) {
    const action = request.action;
    const handlerInfo = handlers.get(action);
    
    if (!handlerInfo) {
      console.warn(`📨 No handler for action: ${action}`);
      return false;
    }
    
    const { handler, config } = handlerInfo;
    
    // Run async handler chain
    (async () => {
      try {
        // Run middlewares
        let shouldContinue = true;
        for (const middleware of middlewares) {
          const result = await middleware(request, sender, config);
          if (result === false) {
            shouldContinue = false;
            break;
          }
          if (result && typeof result === 'object' && result.handled) {
            safeSendResponse(sendResponse, result.response);
            return;
          }
        }
        
        if (!shouldContinue) {
          return;
        }
        
        // Run handler
        const result = await handler(request, sender);
        safeSendResponse(sendResponse, result);
        
      } catch (error) {
        console.error(`❌ Handler error for ${action}:`, error);
        safeSendResponse(sendResponse, { 
          success: false, 
          error: error.message 
        });
      }
    })();
    
    return config.async;
  }

  /**
   * Safe send response that handles closed ports
   * @param {Function} sendResponse - Response callback
   * @param {any} data - Response data
   */
  function safeSendResponse(sendResponse, data) {
    try {
      if (sendResponse && typeof sendResponse === 'function') {
        sendResponse(data);
      }
    } catch (e) {
      console.warn('Could not send response (port closed):', e.message);
    }
  }

  /**
   * Create the main message listener
   * @returns {Function} Listener function for chrome.runtime.onMessage
   */
  function createListener() {
    return (request, sender, sendResponse) => {
      return process(request, sender, sendResponse);
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 📤 PUBLIC API
  // ═══════════════════════════════════════════════════════════
  return Object.freeze({
    register,
    registerAll,
    use,
    process,
    createListener,
    safeSendResponse
  });
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MessageHandler;
}
if (typeof self !== 'undefined') {
  self.MessageHandler = MessageHandler;
}
if (typeof window !== 'undefined') {
  window.MessageHandler = MessageHandler;
}
