// ═══════════════════════════════════════════════════════════
// Undo/Redo Manager - Centralized State Snapshot Service
// ═══════════════════════════════════════════════════════════

const UndoManager = (() => {
  let undoStack = [];
  let redoStack = [];
  const MAX_HISTORY = 50; // Maximum undo steps
  let isRestoring = false; // Flag to prevent loops during restore

  /**
   * State snapshot structure
   * @typedef {Object} Snapshot
   * @property {string} canvasData - Canvas image data as data URL
   * @property {Array} stickers - Array of sticker states
   * @property {number} timestamp - Snapshot timestamp
   * @property {string} action - Description of action (for debugging)
   */

  /**
   * Save current state to undo stack
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Array} stickers - Current stickers array
   * @param {string} action - Action description
   */
  function saveState(canvas, stickers, action = 'edit') {
    if (isRestoring) return; // Don't save during undo/redo

    try {
      // Create snapshot
      const snapshot = {
        canvasData: canvas.toDataURL('image/png'),
        stickers: JSON.parse(JSON.stringify(stickers.map(s => ({
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          opacity: s.opacity,
          rotation: s.rotation,
          name: s.name,
          imgSrc: s.img?.src || s.imgSrc // Store image source
        })))),
        timestamp: Date.now(),
        action
      };

      // Add to undo stack
      undoStack.push(snapshot);

      // Limit stack size
      if (undoStack.length > MAX_HISTORY) {
        undoStack.shift();
      }

      // Clear redo stack on new action
      redoStack = [];

      // Update UI buttons if they exist
      updateButtons();

      console.log(`✅ State saved: ${action} (Stack: ${undoStack.length})`);
    } catch (error) {
      console.error('❌ Failed to save state:', error);
    }
  }

  /**
   * Undo last action
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} context - Canvas 2D context
   * @param {Array} stickers - Stickers array
   * @param {Function} drawCallback - Callback to redraw canvas
   * @returns {Promise<boolean>} Success status
   */
  async function undo(canvas, context, stickers, drawCallback) {
    if (undoStack.length === 0) {
      console.warn('⚠️ Nothing to undo');
      return false;
    }

    try {
      isRestoring = true;

      // Save current state to redo stack before undoing
      const currentState = {
        canvasData: canvas.toDataURL('image/png'),
        stickers: JSON.parse(JSON.stringify(stickers.map(s => ({
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          opacity: s.opacity,
          rotation: s.rotation,
          name: s.name,
          imgSrc: s.img?.src || s.imgSrc
        })))),
        timestamp: Date.now(),
        action: 'current'
      };
      redoStack.push(currentState);

      // Get previous state
      const previousState = undoStack.pop();

      // Restore canvas
      await restoreState(canvas, context, stickers, previousState, drawCallback);

      // Update UI
      updateButtons();

      console.log(`↶ Undo: ${previousState.action}`);
      return true;
    } catch (error) {
      console.error('❌ Undo failed:', error);
      return false;
    } finally {
      isRestoring = false;
    }
  }

  /**
   * Redo last undone action
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} context - Canvas 2D context
   * @param {Array} stickers - Stickers array
   * @param {Function} drawCallback - Callback to redraw canvas
   * @returns {Promise<boolean>} Success status
   */
  async function redo(canvas, context, stickers, drawCallback) {
    if (redoStack.length === 0) {
      console.warn('⚠️ Nothing to redo');
      return false;
    }

    try {
      isRestoring = true;

      // Save current state to undo stack
      const currentState = {
        canvasData: canvas.toDataURL('image/png'),
        stickers: JSON.parse(JSON.stringify(stickers.map(s => ({
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          opacity: s.opacity,
          rotation: s.rotation,
          name: s.name,
          imgSrc: s.img?.src || s.imgSrc
        })))),
        timestamp: Date.now(),
        action: 'current'
      };
      undoStack.push(currentState);

      // Get next state
      const nextState = redoStack.pop();

      // Restore canvas
      await restoreState(canvas, context, stickers, nextState, drawCallback);

      // Update UI
      updateButtons();

      console.log(`↷ Redo: ${nextState.action}`);
      return true;
    } catch (error) {
      console.error('❌ Redo failed:', error);
      return false;
    } finally {
      isRestoring = false;
    }
  }

  /**
   * Restore state from snapshot
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} context - Canvas 2D context
   * @param {Array} stickers - Stickers array to update
   * @param {Snapshot} snapshot - State snapshot
   * @param {Function} drawCallback - Callback to redraw canvas
   */
  async function restoreState(canvas, context, stickers, snapshot, drawCallback) {
    // Load canvas image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = snapshot.canvasData;
    });

    // Clear and redraw canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);

    // Restore stickers
    stickers.length = 0; // Clear current stickers

    for (const stickerData of snapshot.stickers) {
      const stickerImg = new Image();
      await new Promise((resolve) => {
        stickerImg.onload = resolve;
        stickerImg.onerror = resolve; // Continue even if sticker fails
        stickerImg.src = stickerData.imgSrc;
      });

      stickers.push({
        img: stickerImg,
        imgSrc: stickerData.imgSrc,
        x: stickerData.x,
        y: stickerData.y,
        w: stickerData.w,
        h: stickerData.h,
        opacity: stickerData.opacity,
        rotation: stickerData.rotation,
        name: stickerData.name,
        selected: false
      });
    }

    // Trigger redraw
    if (drawCallback) {
      drawCallback();
    }
  }

  let domRoot = document; // Default to document

  /**
   * Set the root element for DOM lookups (e.g. ShadowRoot)
   * @param {Node} root 
   */


  /**
   * Update undo/redo button states
   */
  function updateButtons() {
    // Safety check if domRoot is invalid
    if (!domRoot || !domRoot.getElementById) return;

    const undoBtn = domRoot.getElementById('btn-undo');
    const redoBtn = domRoot.getElementById('btn-redo');

    if (undoBtn) {
      undoBtn.disabled = undoStack.length === 0;
      undoBtn.style.opacity = undoStack.length === 0 ? '0.5' : '1';
      undoBtn.style.cursor = undoStack.length === 0 ? 'not-allowed' : 'pointer';
    }

    if (redoBtn) {
      redoBtn.disabled = redoStack.length === 0;
      redoBtn.style.opacity = redoStack.length === 0 ? '0.5' : '1';
      redoBtn.style.cursor = redoStack.length === 0 ? 'not-allowed' : 'pointer';
    }
  }

  /**
   * Clear all history
   */
  function clear() {
    undoStack = [];
    redoStack = [];
    updateButtons();
    console.log('🗑️ Undo/Redo history cleared');
  }

  /**
   * Get history info
   * @returns {Object} History information
   */
  function getInfo() {
    return {
      undoStackSize: undoStack.length,
      redoStackSize: redoStack.length,
      maxHistory: MAX_HISTORY,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0
    };
  }

  /**
   * Check if currently restoring (to prevent loops)
   * @returns {boolean}
   */
  function isRestoringState() {
    return isRestoring;
  }

  // Public API
  return {
    saveState,
    undo,
    redo,
    clear,
    getInfo,
    isRestoringState,
    updateButtons
  };
})();

// Make it available globally or as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UndoManager;
} else if (typeof window !== 'undefined') {
  window.undoManager = UndoManager;
}
