(() => {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // SNIPE IMAGE EDITOR CORE — SaaS-Optimized Version
    // ═══════════════════════════════════════════════════════════

    const CONFIG = {
        STORAGE_KEY: 'watermarkedImages',
        STICKER_KEY: 'userStickers',
        THEME_STORAGE_KEY: 'snipeEditorTheme',
        CANVAS_ID: 'editor-canvas',
        GALLERY_ID: 'sticker-gallery',
        OVERLAY_ID: 'snipe-editor-root',
        MAX_STICKERS: 20,
        MAX_UNDO_HISTORY: 50,
        DEBOUNCE_RESIZE: 150,
        MIN_STICKER_SIZE: 20,
        DEFAULT_STICKER_SCALE: 0.25,
        ANIMATION_DURATION: 300
    };

    // State Management
    const state = {
        canvas: null,
        ctx: null,
        baseImg: null,
        stickers: [],
        activeSticker: null,
        zoomLevel: 1,
        baseCanvasWidth: 0,
        baseCanvasHeight: 0,
        isDragging: false,
        isResizing: false,
        isSidebarOpen: false,
        dragOffset: { x: 0, y: 0 },
        resizeTimeout: null,
        isInitialized: false,
        isSaving: false
    };

    // Tool State
    const toolState = {
        activeTool: null,
        settings: {},
        shapeStart: null
    };

    // Filter State
    const filterState = {
        brightness: 0,
        contrast: 0,
        saturation: 0
    };

    // Resize Handle State
    let activeHandle = null;
    let resizeStart = { x: 0, y: 0, w: 0, h: 0, sx: 0, sy: 0 };

    // ─────────────────────────────────────────────
    // 🌉 Iframe Communication Bridge
    // ─────────────────────────────────────────────
    window.addEventListener('message', async (event) => {
        const { type, payload } = event.data || {};
        if (!type) return;

        console.log('[Editor] Received message:', type);

        switch (type) {
            case 'INIT_IMAGE':
                await initEditor(payload.src, payload.index);
                break;
            case 'REQUEST_SAVE':
                saveEditedImage();
                break;
        }
    });

    function notifyHostReady() {
        console.log('[Editor] Sending EDITOR_READY');
        window.parent.postMessage({ type: 'EDITOR_READY' }, '*');
    }

    // ─────────────────────────────────────────────
    // 🚀 Initialization
    // ─────────────────────────────────────────────
    async function initEditor(src, index) {
        try {
            showLoading('Loading image...');
            console.log('🎨 Initializing Editor...');

            state.canvas = document.getElementById(CONFIG.CANVAS_ID);
            if (!state.canvas) throw new Error('Canvas element not found');
            state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });

            // Load Image
            state.baseImg = await loadImage(src);

            // Reset State
            resetState();

            // Show overlay
            const overlay = document.getElementById(CONFIG.OVERLAY_ID);
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('show');
            }

            // Calculate initial size
            handleWindowResize();

            // Configure canvas
            state.ctx.imageSmoothingEnabled = true;
            state.ctx.imageSmoothingQuality = 'high';

            // Initial Draw
            drawCanvas();

            // Load stickers
            await loadStickers();

            // Initialize theme
            await initTheme();

            // Update UI
            updateCanvasSizeDisplay();
            updateStickerCount();

            // Save initial state
            saveStateBeforeOperation('open editor');

            state.isInitialized = true;
            hideLoading();

            showToast('Editor ready!', 'success');
            console.log('✅ Editor Initialized');
        } catch (error) {
            console.error('❌ Failed to init editor:', error);
            hideLoading();
            showToast('Failed to load editor: ' + error.message, 'error');
        }
    }

    function resetState() {
        state.zoomLevel = 0.9; // Default to 90% zoom
        state.stickers.length = 0;
        state.activeSticker = null;
        state.isDragging = false;
        state.isResizing = false;
        toolState.activeTool = null;
        Object.assign(filterState, { brightness: 0, contrast: 0, saturation: 0 });
        if (typeof undoManager !== 'undefined') undoManager.clear();
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = src;
        });
    }

    // ─────────────────────────────────────────────
    // 🎨 Canvas Rendering
    // ─────────────────────────────────────────────
    function drawCanvas() {
        if (!state.canvas || !state.ctx || !state.baseImg) return;

        const { ctx, canvas, baseImg, stickers, baseCanvasWidth, baseCanvasHeight } = state;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw base image
        if (baseCanvasWidth > 0 && baseCanvasHeight > 0) {
            ctx.drawImage(baseImg, 0, 0, baseCanvasWidth, baseCanvasHeight);
        }

        // Apply live filters
        applyLiveFilters(ctx);

        // Draw stickers
        stickers.forEach(sticker => {
            drawSticker(ctx, sticker);
        });

        // Draw crop overlay if active
        if (toolState.activeTool === 'crop' && typeof editorTools !== 'undefined' && editorTools.CropTool) {
            editorTools.CropTool.drawOverlay(ctx);
        }
    }

    function drawSticker(ctx, sticker) {
        if (!sticker.img) return;

        ctx.save();

        const { x, y, w, h, rotation = 0, opacity = 1, selected } = sticker;

        // Position at center for rotation
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.globalAlpha = opacity;

        try {
            ctx.drawImage(sticker.img, -w / 2, -h / 2, w, h);
        } catch (e) {
            console.warn('Failed to draw sticker');
        }

        // Draw selection UI if selected and not saving
        if (selected && !state.isSaving) {
            drawStickerSelection(ctx, w, h);
        }

        ctx.restore();
    }

    function drawStickerSelection(ctx, w, h) {
        // Selection border with glow
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.shadowBlur = 0;

        // Resize handles
        const handleSize = 10;
        const handles = [
            { x: -w / 2, y: -h / 2 },
            { x: w / 2, y: -h / 2 },
            { x: w / 2, y: h / 2 },
            { x: -w / 2, y: h / 2 }
        ];

        handles.forEach(pos => {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize, 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    // ─────────────────────────────────────────────
    // 💾 Save & Close
    // ─────────────────────────────────────────────
    async function saveEditedImage() {
        try {
            showLoading('Saving...');
            state.isSaving = true;

            // Redraw without selection UI
            drawCanvas();

            const dataUrl = state.canvas.toDataURL('image/png');

            window.parent.postMessage({
                type: 'SAVE_IMAGE',
                payload: { dataUrl }
            }, '*');

            showToast('Image saved!', 'success');
            console.log('✅ Save complete');
        } catch (e) {
            console.error('Save failed:', e);
            showToast('Failed to save image', 'error');
        } finally {
            state.isSaving = false;
            hideLoading();
        }
    }

    function closeEditor(saved = false) {
        window.parent.postMessage({
            type: 'CLOSE_EDITOR',
            payload: { saved }
        }, '*');
    }

    // ─────────────────────────────────────────────
    // 🖱️ Event Handlers
    // ─────────────────────────────────────────────
    function getEventPos(e) {
        const rect = state.canvas.getBoundingClientRect();
        const scaleX = state.canvas.width / rect.width;
        const scaleY = state.canvas.height / rect.height;

        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function handleMouseDown(e) {
        // Tool delegation
        if (toolState.activeTool) {
            const { x, y } = getEventPos(e);
            handleToolMouseDown(toolState.activeTool, x, y);
            return;
        }

        const { x, y } = getEventPos(e);

        // Check resize handles first
        if (state.activeSticker?.selected) {
            const handle = checkResizeHandles(x, y, state.activeSticker);
            if (handle) {
                state.isResizing = true;
                activeHandle = handle;
                resizeStart = {
                    x, y,
                    w: state.activeSticker.w,
                    h: state.activeSticker.h,
                    sx: state.activeSticker.x,
                    sy: state.activeSticker.y
                };
                return;
            }
        }

        // Check sticker selection
        const clickedSticker = findStickerAt(x, y);

        if (clickedSticker) {
            state.stickers.forEach(s => s.selected = false);
            clickedSticker.selected = true;
            state.activeSticker = clickedSticker;

            state.isDragging = true;
            state.dragOffset.x = x - clickedSticker.x;
            state.dragOffset.y = y - clickedSticker.y;

            showPropertiesPanel();
        } else {
            state.stickers.forEach(s => s.selected = false);
            state.activeSticker = null;
            hidePropertiesPanel();
        }

        drawCanvas();
    }

    function handleMouseMove(e) {
        const { x, y } = getEventPos(e);

        // Tool delegation
        if (toolState.activeTool) {
            handleToolMouseMove(toolState.activeTool, x, y);
            return;
        }

        // Resizing
        if (state.isResizing && state.activeSticker && activeHandle) {
            handleStickerResize(x, y);
            return;
        }

        // Dragging
        if (state.isDragging && state.activeSticker) {
            state.activeSticker.x = x - state.dragOffset.x;
            state.activeSticker.y = y - state.dragOffset.y;
            state.canvas.style.cursor = 'grabbing';
            drawCanvas();
            return;
        }

        // Update cursor
        updateCursor(x, y);
    }

    function handleMouseUp(e) {
        const { x, y } = getEventPos(e);

        // Tool delegation
        if (toolState.activeTool) {
            handleToolMouseUp(toolState.activeTool, x, y);
            return;
        }

        if (state.isDragging) {
            state.isDragging = false;
            state.canvas.style.cursor = 'default';
            saveStateBeforeOperation('move sticker');
        }

        if (state.isResizing) {
            state.isResizing = false;
            activeHandle = null;
            saveStateBeforeOperation('resize sticker');
        }
    }

    function handleStickerResize(x, y) {
        const dx = x - resizeStart.x;
        const dy = y - resizeStart.y;
        const aspectRatio = resizeStart.w / resizeStart.h;

        let newW = resizeStart.w;
        let newH = resizeStart.h;
        let newX = resizeStart.sx;
        let newY = resizeStart.sy;

        switch (activeHandle) {
            case 'br':
                newW = resizeStart.w + dx;
                newH = newW / aspectRatio;
                break;
            case 'bl':
                newW = resizeStart.w - dx;
                newH = newW / aspectRatio;
                newX = resizeStart.sx + (resizeStart.w - newW);
                break;
            case 'tr':
                newW = resizeStart.w + dx;
                newH = newW / aspectRatio;
                newY = resizeStart.sy + (resizeStart.h - newH);
                break;
            case 'tl':
                newW = resizeStart.w - dx;
                newH = newW / aspectRatio;
                newX = resizeStart.sx + (resizeStart.w - newW);
                newY = resizeStart.sy + (resizeStart.h - newH);
                break;
        }

        if (newW > CONFIG.MIN_STICKER_SIZE && newH > CONFIG.MIN_STICKER_SIZE) {
            Object.assign(state.activeSticker, { w: newW, h: newH, x: newX, y: newY });
            drawCanvas();
        }
    }

    function updateCursor(x, y) {
        if (toolState.activeTool) {
            state.canvas.style.cursor = 'crosshair';
            return;
        }

        const handle = checkResizeHandles(x, y, state.activeSticker);
        if (handle) {
            state.canvas.style.cursor = (handle === 'tl' || handle === 'br') ? 'nwse-resize' : 'nesw-resize';
            return;
        }

        const overSticker = findStickerAt(x, y);
        state.canvas.style.cursor = overSticker ? 'move' : 'default';
    }

    // ─────────────────────────────────────────────
    // 🧱 Hit Testing
    // ─────────────────────────────────────────────
    function findStickerAt(px, py) {
        for (let i = state.stickers.length - 1; i >= 0; i--) {
            if (isPointInSticker(px, py, state.stickers[i])) {
                return state.stickers[i];
            }
        }
        return null;
    }

    function isPointInSticker(px, py, s) {
        const cx = s.x + s.w / 2;
        const cy = s.y + s.h / 2;
        const rad = -(s.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = px - cx;
        const dy = py - cy;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        return Math.abs(rdx) <= s.w / 2 && Math.abs(rdy) <= s.h / 2;
    }

    function getResizeHandles(sticker) {
        return {
            tl: { x: sticker.x, y: sticker.y },
            tr: { x: sticker.x + sticker.w, y: sticker.y },
            bl: { x: sticker.x, y: sticker.y + sticker.h },
            br: { x: sticker.x + sticker.w, y: sticker.y + sticker.h }
        };
    }

    function checkResizeHandles(x, y, sticker) {
        if (!sticker?.selected) return null;
        const handles = getResizeHandles(sticker);
        const touchRadius = 15;

        for (const [key, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) <= touchRadius && Math.abs(y - pos.y) <= touchRadius) {
                return key;
            }
        }
        return null;
    }

    // ─────────────────────────────────────────────
    // 🧩 Sticker Management
    // ─────────────────────────────────────────────
    async function loadStickers() {
        const gallery = document.getElementById(CONFIG.GALLERY_ID);
        if (!gallery) return;

        gallery.innerHTML = '<div class="loading">Loading stickers...</div>';

        const defaultStickers = [
            '../assets/stickers/sale.png',
            '../assets/stickers/new.png',
            '../assets/stickers/best.png',
            '../assets/stickers/hot.png',
            '../assets/stickers/limited.png',
            '../assets/stickers/gift.png'
        ];

        gallery.innerHTML = '';

        defaultStickers.forEach(src => {
            const div = document.createElement('div');
            div.className = 'sticker-item';
            div.onclick = () => addSticker(src);
            div.setAttribute('role', 'button');
            div.setAttribute('tabindex', '0');
            div.onkeydown = (e) => { if (e.key === 'Enter') addSticker(src); };

            const img = document.createElement('img');
            img.src = src;
            img.alt = 'Sticker';
            img.draggable = false;
            img.onerror = () => div.remove();

            div.appendChild(img);
            gallery.appendChild(div);
        });
    }

    async function addSticker(src) {
        if (state.stickers.length >= CONFIG.MAX_STICKERS) {
            showToast(`Maximum ${CONFIG.MAX_STICKERS} stickers allowed`, 'warning');
            return;
        }

        try {
            const img = await loadImage(src);
            const canvasMinDim = Math.min(state.canvas.width, state.canvas.height);
            const targetSize = canvasMinDim * CONFIG.DEFAULT_STICKER_SCALE;
            const aspect = img.width / img.height;

            let w, h;
            if (aspect >= 1) {
                w = targetSize;
                h = targetSize / aspect;
            } else {
                h = targetSize;
                w = targetSize * aspect;
            }

            const sticker = {
                img,
                imgSrc: src,
                x: (state.canvas.width - w) / 2,
                y: (state.canvas.height - h) / 2,
                w, h,
                rotation: 0,
                opacity: 1,
                selected: true
            };

            // Deselect others
            state.stickers.forEach(s => s.selected = false);
            deactivateTool();

            state.stickers.push(sticker);
            state.activeSticker = sticker;

            drawCanvas();
            saveStateBeforeOperation('add sticker');
            updateStickerCount();
            showPropertiesPanel();
            showToast('Sticker added!', 'success');
        } catch (e) {
            console.error('Failed to add sticker:', e);
            showToast('Failed to load sticker', 'error');
        }
    }

    function handleStickerUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => addSticker(event.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    function duplicateSticker() {
        if (!state.activeSticker) return;

        const newSticker = { ...state.activeSticker, selected: true };
        newSticker.x += 20;
        newSticker.y += 20;

        state.stickers.forEach(s => s.selected = false);
        state.stickers.push(newSticker);
        state.activeSticker = newSticker;

        drawCanvas();
        saveStateBeforeOperation('duplicate sticker');
        updateStickerCount();
        showToast('Sticker duplicated', 'info');
    }

    function deleteSticker(sticker) {
        const idx = state.stickers.indexOf(sticker);
        if (idx > -1) {
            state.stickers.splice(idx, 1);
            if (state.activeSticker === sticker) state.activeSticker = null;
            drawCanvas();
            updateStickerCount();
            hidePropertiesPanel();
            saveStateBeforeOperation('delete sticker');
        }
    }

    function deleteActiveSticker() {
        if (state.activeSticker) {
            deleteSticker(state.activeSticker);
            showToast('Sticker deleted', 'info');
        }
    }

    function clearAllStickers() {
        if (state.stickers.length === 0) return;
        if (confirm('Clear all stickers?')) {
            state.stickers.length = 0;
            state.activeSticker = null;
            drawCanvas();
            updateStickerCount();
            hidePropertiesPanel();
            saveStateBeforeOperation('clear stickers');
            showToast('All stickers cleared', 'info');
        }
    }

    // ─────────────────────────────────────────────
    // 🛠️ Tool Management
    // ─────────────────────────────────────────────
    function activateTool(name) {
        toolState.activeTool = name;

        // Update button states
        document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`btn-tool-${name}`);
        if (btn) btn.classList.add('active');

        // Show properties panel
        document.querySelectorAll('.tool-property-panel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById(`properties-${name}`);
        if (panel) panel.style.display = 'block';

        // Deselect stickers when using tools
        state.stickers.forEach(s => s.selected = false);
        state.activeSticker = null;
        drawCanvas();
    }

    function deactivateTool(name) {
        if (!name || toolState.activeTool === name) {
            toolState.activeTool = null;
            document.querySelectorAll('.btn-tool').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tool-property-panel').forEach(p => p.style.display = 'none');
        }
    }

    function handleToolMouseDown(tool, x, y) {
        switch (tool) {
            case 'draw':
                startDrawing(x, y);
                break;
            case 'eraser':
                startErasing(x, y);
                break;
            case 'shapes':
                toolState.shapeStart = { x, y };
                break;
        }
    }

    function handleToolMouseMove(tool, x, y) {
        switch (tool) {
            case 'draw':
                continueDrawing(x, y);
                break;
            case 'eraser':
                continueErasing(x, y);
                break;
            case 'shapes':
                if (toolState.shapeStart) drawShapePreview(x, y);
                break;
        }
    }

    function handleToolMouseUp(tool, x, y) {
        switch (tool) {
            case 'draw':
                stopDrawing();
                break;
            case 'eraser':
                stopErasing();
                break;
            case 'shapes':
                finishShape(x, y);
                break;
        }
    }

    // ─────────────────────────────────────────────
    // ✏️ Drawing Tools
    // ─────────────────────────────────────────────
    function startDrawing(x, y) {
        if (!editorTools?.DrawTool) return;
        const color = document.getElementById('draw-color')?.value || '#000000';
        const size = parseInt(document.getElementById('draw-brush-size')?.value || 5);
        const opacity = (parseInt(document.getElementById('draw-opacity')?.value) || 100) / 100;

        editorTools.DrawTool.init({ color, brushSize: size, opacity });
        editorTools.DrawTool.startDrawing(state.ctx, x, y);
    }

    function continueDrawing(x, y) {
        editorTools?.DrawTool?.draw(state.ctx, x, y);
    }

    function stopDrawing() {
        editorTools?.DrawTool?.stopDrawing();
        bakeCanvasToBase();
        saveStateBeforeOperation('draw');
    }

    function startErasing(x, y) {
        if (!editorTools?.EraserTool) return;
        const size = parseInt(document.getElementById('eraser-size')?.value || 20);
        editorTools.EraserTool.init(size);
        editorTools.EraserTool.startErasing(state.ctx, x, y);
    }

    function continueErasing(x, y) {
        editorTools?.EraserTool?.erase(state.ctx, x, y);
    }

    function stopErasing() {
        editorTools?.EraserTool?.stopErasing();
        bakeCanvasToBase();
        saveStateBeforeOperation('erase');
    }

    // ─────────────────────────────────────────────
    // ⬜ Shape Tools
    // ─────────────────────────────────────────────
    function drawShapePreview(x, y) {
        if (!toolState.shapeStart || !editorTools?.ShapesTool) return;

        drawCanvas();

        const type = document.getElementById('shape-type')?.value || 'rectangle';
        const color = document.getElementById('shape-color')?.value || '#000000';
        const filled = document.getElementById('shape-filled')?.checked || false;
        const { x: sx, y: sy } = toolState.shapeStart;

        const ctx = state.ctx;
        const w = x - sx;
        const h = y - sy;

        switch (type) {
            case 'rectangle':
                editorTools.ShapesTool.drawRectangle(ctx, sx, sy, w, h, color, filled);
                break;
            case 'circle':
                const radius = Math.sqrt(w * w + h * h);
                editorTools.ShapesTool.drawCircle(ctx, sx, sy, radius, color, filled);
                break;
            case 'arrow':
                editorTools.ShapesTool.drawArrow(ctx, sx, sy, x, y, color);
                break;
            case 'line':
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.restore();
                break;
        }
    }

    function finishShape(x, y) {
        if (toolState.shapeStart) {
            drawShapePreview(x, y);
            bakeCanvasToBase();
            toolState.shapeStart = null;
            saveStateBeforeOperation('add shape');
        }
    }

    // ─────────────────────────────────────────────
    // 📝 Text Tool
    // ─────────────────────────────────────────────
    function handleAddText() {
        if (!editorTools?.TextTool) return;

        const text = document.getElementById('text-input')?.value;
        if (!text) {
            showToast('Please enter text', 'warning');
            return;
        }

        const settings = {
            font: document.getElementById('text-font')?.value || 'Arial',
            size: parseInt(document.getElementById('text-size')?.value || 32),
            color: document.getElementById('text-color')?.value || '#000000',
            bold: document.getElementById('text-bold')?.checked,
            italic: document.getElementById('text-italic')?.checked
        };

        editorTools.TextTool.init(settings);
        editorTools.TextTool.addText(state.ctx, text, state.canvas.width / 2, state.canvas.height / 2);

        bakeCanvasToBase();
        saveStateBeforeOperation('add text');
        showToast('Text added', 'success');
    }

    // ─────────────────────────────────────────────
    // ✂️ Crop Tool
    // ─────────────────────────────────────────────
    function handleCropTool() {
        activateTool('crop');
        if (editorTools?.CropTool) {
            const aspect = document.getElementById('crop-aspect-ratio')?.value || 'custom';
            editorTools.CropTool.init(state.canvas, aspect);
            drawCanvas();
        }
    }

    async function applyCrop() {
        if (!editorTools?.CropTool) return;
        try {
            showLoading('Cropping...');
            const newImg = await editorTools.CropTool.apply(state.canvas, state.baseImg);
            state.baseImg = newImg;
            deactivateTool('crop');
            handleWindowResize();
            saveStateBeforeOperation('crop');
            showToast('Image cropped', 'success');
        } catch (e) {
            showToast('Crop failed', 'error');
        } finally {
            hideLoading();
        }
    }

    // ─────────────────────────────────────────────
    // 🔄 Transform Tools
    // ─────────────────────────────────────────────
    async function handleRotate() {
        if (!editorTools?.RotateTool) return;
        try {
            showLoading('Rotating...');
            const newImg = await editorTools.RotateTool.rotate(state.canvas, state.baseImg, 90);
            state.baseImg = newImg;
            handleWindowResize();
            saveStateBeforeOperation('rotate');
            showToast('Rotated 90°', 'success');
        } catch (e) {
            showToast('Rotation failed', 'error');
        } finally {
            hideLoading();
        }
    }

    async function handleFlipHorizontal() {
        if (!editorTools?.RotateTool) return;
        try {
            const newImg = await editorTools.RotateTool.flipHorizontal(state.canvas, state.baseImg);
            state.baseImg = newImg;
            drawCanvas();
            saveStateBeforeOperation('flip horizontal');
            showToast('Flipped horizontally', 'info');
        } catch (e) {
            showToast('Flip failed', 'error');
        }
    }

    async function handleFlipVertical() {
        if (!editorTools?.RotateTool) return;
        try {
            const newImg = await editorTools.RotateTool.flipVertical(state.canvas, state.baseImg);
            state.baseImg = newImg;
            drawCanvas();
            saveStateBeforeOperation('flip vertical');
            showToast('Flipped vertically', 'info');
        } catch (e) {
            showToast('Flip failed', 'error');
        }
    }

    // ─────────────────────────────────────────────
    // 🎨 Filter Tools
    // ─────────────────────────────────────────────
    function updateFilterState(key, value) {
        filterState[key] = parseInt(value);
        drawCanvas();
    }

    function applyLiveFilters(ctx) {
        if (!editorTools?.FiltersTool) return;
        if (filterState.brightness !== 0) editorTools.FiltersTool.brightness(ctx, state.canvas, filterState.brightness);
        if (filterState.contrast !== 0) editorTools.FiltersTool.contrast(ctx, state.canvas, filterState.contrast);
        if (filterState.saturation !== 0) editorTools.FiltersTool.saturation(ctx, state.canvas, filterState.saturation);
    }

    async function applyFiltersToImage() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = state.canvas.width;
        tempCanvas.height = state.canvas.height;
        const tCtx = tempCanvas.getContext('2d');

        tCtx.drawImage(state.baseImg, 0, 0, state.canvas.width, state.canvas.height);
        applyLiveFilters(tCtx);

        const newImg = new Image();
        newImg.onload = () => {
            state.baseImg = newImg;
            resetFilterControls();
            drawCanvas();
            saveStateBeforeOperation('apply filters');
            showToast('Filters applied', 'success');
        };
        newImg.src = tempCanvas.toDataURL();
    }

    function resetFilterControls() {
        Object.assign(filterState, { brightness: 0, contrast: 0, saturation: 0 });
        ['brightness', 'contrast', 'saturation'].forEach(key => {
            const slider = document.getElementById(`filter-${key}`);
            const value = document.getElementById(`filter-${key}-value`);
            if (slider) slider.value = 0;
            if (value) value.textContent = '0';
        });
    }

    // ─────────────────────────────────────────────
    // 🤖 AI Tools
    // ─────────────────────────────────────────────
    function handleAutoEnhance() {
        showToast('Auto enhancing...', 'info');
        updateFilterState('contrast', 15);
        updateFilterState('saturation', 10);
        updateFilterState('brightness', 5);
        applyFiltersToImage();
    }

    // ─────────────────────────────────────────────
    // 📤 Export
    // ─────────────────────────────────────────────
    function handleExport() {
        const format = document.getElementById('export-format')?.value || 'png';
        if (editorTools?.ExportTool) {
            state.isSaving = true;
            drawCanvas();
            editorTools.ExportTool.download(state.canvas, 'edited-image', format, 0.9);
            state.isSaving = false;
            drawCanvas();
            showToast('Image exported', 'success');
        }
    }

    async function handleCopyToClipboard() {
        if (editorTools?.ExportTool) {
            state.isSaving = true;
            drawCanvas();
            const success = await editorTools.ExportTool.copyToClipboard(state.canvas);
            state.isSaving = false;
            drawCanvas();
            showToast(success ? 'Copied to clipboard!' : 'Copy failed', success ? 'success' : 'error');
        }
    }

    // ─────────────────────────────────────────────
    // 📐 Layout & Zoom
    // ─────────────────────────────────────────────
    function handleWindowResize() {
        if (state.resizeTimeout) clearTimeout(state.resizeTimeout);
        state.resizeTimeout = setTimeout(() => {
            if (!state.baseImg || !state.canvas) return;

            const space = calculateAvailableSpace();
            const scale = Math.min(space.width / state.baseImg.width, space.height / state.baseImg.height, 1);

            state.baseCanvasWidth = state.baseImg.width * scale;
            state.baseCanvasHeight = state.baseImg.height * scale;

            state.canvas.width = state.baseCanvasWidth;
            state.canvas.height = state.baseCanvasHeight;

            applyCanvasZoom();
            drawCanvas();
            updateCanvasSizeDisplay();
        }, CONFIG.DEBOUNCE_RESIZE);
    }

    function calculateAvailableSpace() {
        const sidebarWidth = 280;
        const headerHeight = 56;
        const footerHeight = 52;
        const padding = 48;

        return {
            width: window.innerWidth - sidebarWidth - padding,
            height: window.innerHeight - headerHeight - footerHeight - padding
        };
    }

    function applyCanvasZoom() {
        if (!state.canvas) return;
        state.canvas.style.width = (state.baseCanvasWidth * state.zoomLevel) + 'px';
        state.canvas.style.height = (state.baseCanvasHeight * state.zoomLevel) + 'px';

        const display = document.getElementById('zoom-level');
        if (display) display.textContent = Math.round(state.zoomLevel * 100) + '%';
    }

    function zoomIn() {
        if (state.zoomLevel < 3) {
            state.zoomLevel = Math.min(3, state.zoomLevel + 0.1);
            applyCanvasZoom();
        }
    }

    function zoomOut() {
        if (state.zoomLevel > 0.2) {
            state.zoomLevel = Math.max(0.2, state.zoomLevel - 0.1);
            applyCanvasZoom();
        }
    }

    function resetZoom() {
        state.zoomLevel = 1;
        applyCanvasZoom();
    }

    // ─────────────────────────────────────────────
    // 📸 State Management
    // ─────────────────────────────────────────────
    function saveStateBeforeOperation(opName) {
        if (typeof undoManager !== 'undefined') {
            undoManager.saveState(state.canvas, state.stickers, opName);
        }
    }

    function bakeCanvasToBase() {
        if (!state.canvas) return;
        const newImg = new Image();
        newImg.onload = () => { state.baseImg = newImg; };
        newImg.src = state.canvas.toDataURL();
    }

    // ─────────────────────────────────────────────
    // 🎨 Theme
    // ─────────────────────────────────────────────
    async function initTheme() {
        const stored = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
        const theme = stored || 'light';
        applyTheme(theme);
    }

    function applyTheme(theme) {
        const shell = document.querySelector('.editor-shell');
        if (shell) {
            shell.classList.remove('light-theme', 'dark-theme');
            shell.classList.add(`${theme}-theme`);
        }
        localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
    }

    function toggleTheme() {
        const shell = document.querySelector('.editor-shell');
        const current = shell?.classList.contains('dark-theme') ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // ─────────────────────────────────────────────
    // 📊 UI Updates
    // ─────────────────────────────────────────────
    function updateCanvasSizeDisplay() {
        const display = document.getElementById('canvas-size');
        if (display && state.canvas) {
            display.textContent = `${Math.round(state.canvas.width)} × ${Math.round(state.canvas.height)}`;
        }
    }

    function updateStickerCount() {
        const display = document.getElementById('sticker-count');
        if (display) {
            display.textContent = `${state.stickers.length}/${CONFIG.MAX_STICKERS}`;
        }
    }

    function showPropertiesPanel() {
        const panel = document.getElementById('sticker-properties');
        if (panel) panel.style.display = 'block';
    }

    function hidePropertiesPanel() {
        const panel = document.getElementById('sticker-properties');
        if (panel) panel.style.display = 'none';
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('editor-side');
        const overlay = document.getElementById('sidebar-overlay');
        state.isSidebarOpen = !state.isSidebarOpen;

        sidebar?.classList.toggle('active', state.isSidebarOpen);
        overlay?.classList.toggle('active', state.isSidebarOpen);
    }

    // ─────────────────────────────────────────────
    // 🔔 Toast Notifications
    // ─────────────────────────────────────────────
    function showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ─────────────────────────────────────────────
    // ⏳ Loading States
    // ─────────────────────────────────────────────
    function showLoading(text = 'Loading...') {
        const overlay = document.querySelector('.loading-overlay');
        const textEl = document.querySelector('.loading-text');
        if (overlay) overlay.classList.add('active');
        if (textEl) textEl.textContent = text;
    }

    function hideLoading() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    // ─────────────────────────────────────────────
    // ⌨️ Keyboard Shortcuts
    // ─────────────────────────────────────────────
    function handleKeyboard(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

        // Undo: Ctrl/Cmd + Z
        if (ctrlKey && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            if (typeof undoManager !== 'undefined') {
                undoManager.undo(state.canvas, state.ctx, state.stickers, drawCanvas);
            }
            return;
        }

        // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
        if ((ctrlKey && e.shiftKey && e.key === 'z') || (ctrlKey && e.key === 'y')) {
            e.preventDefault();
            if (typeof undoManager !== 'undefined') {
                undoManager.redo(state.canvas, state.ctx, state.stickers, drawCanvas);
            }
            return;
        }

        // Save: Ctrl/Cmd + S
        if (ctrlKey && e.key === 's') {
            e.preventDefault();
            saveEditedImage();
            return;
        }

        // Delete: Delete or Backspace
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.activeSticker) {
            e.preventDefault();
            deleteActiveSticker();
            return;
        }

        // Escape: Deselect or close
        if (e.key === 'Escape') {
            if (toolState.activeTool) {
                deactivateTool();
            } else if (state.activeSticker) {
                state.stickers.forEach(s => s.selected = false);
                state.activeSticker = null;
                hidePropertiesPanel();
                drawCanvas();
            }
            return;
        }

        // Tool shortcuts
        switch (e.key.toLowerCase()) {
            case 'd': activateTool('draw'); break;
            case 'e': activateTool('eraser'); break;
            case 't': activateTool('text'); break;
            case 'c': handleCropTool(); break;
            case '+':
            case '=': zoomIn(); break;
            case '-': zoomOut(); break;
            case '0': resetZoom(); break;
        }
    }

    // ─────────────────────────────────────────────
    // 🔌 Event Binding
    // ─────────────────────────────────────────────
    function setupEventListeners() {
        console.log('🔌 Setting up event listeners...');

        // Canvas events
        const canvas = document.getElementById(CONFIG.CANVAS_ID);
        if (canvas) {
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.style.touchAction = 'none';
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            // Touch events
            canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleMouseDown(e); }, { passive: false });
            canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMouseMove(e); }, { passive: false });
            canvas.addEventListener('touchend', handleMouseUp);
        }

        // Tool buttons
        document.getElementById('btn-tool-crop')?.addEventListener('click', handleCropTool);
        document.getElementById('btn-tool-rotate')?.addEventListener('click', handleRotate);
        document.getElementById('btn-tool-flip-h')?.addEventListener('click', handleFlipHorizontal);
        document.getElementById('btn-tool-flip-v')?.addEventListener('click', handleFlipVertical);
        document.getElementById('btn-tool-draw')?.addEventListener('click', () => activateTool('draw'));
        document.getElementById('btn-tool-eraser')?.addEventListener('click', () => activateTool('eraser'));
        document.getElementById('btn-tool-text')?.addEventListener('click', () => activateTool('text'));
        document.getElementById('btn-tool-shapes')?.addEventListener('click', () => activateTool('shapes'));
        document.getElementById('btn-tool-filters')?.addEventListener('click', () => activateTool('filters'));
        document.getElementById('btn-tool-blur')?.addEventListener('click', () => activateTool('blur'));
        document.getElementById('btn-tool-color')?.addEventListener('click', () => activateTool('color'));

        // Sticker actions
        document.getElementById('btn-duplicate')?.addEventListener('click', duplicateSticker);
        document.getElementById('btn-clear-all')?.addEventListener('click', clearAllStickers);
        document.getElementById('btn-delete-sticker')?.addEventListener('click', deleteActiveSticker);
        document.getElementById('sticker-upload')?.addEventListener('change', handleStickerUpload);

        // Zoom controls
        document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
        document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
        document.getElementById('btn-reset')?.addEventListener('click', resetZoom);

        // Undo/Redo
        document.getElementById('btn-undo')?.addEventListener('click', () => {
            undoManager?.undo(state.canvas, state.ctx, state.stickers, drawCanvas);
        });
        document.getElementById('btn-redo')?.addEventListener('click', () => {
            undoManager?.redo(state.canvas, state.ctx, state.stickers, drawCanvas);
        });

        // Save/Close
        document.getElementById('btn-save-edit')?.addEventListener('click', saveEditedImage);
        document.getElementById('btn-cancel-edit')?.addEventListener('click', () => closeEditor(false));
        document.getElementById('btn-close-editor')?.addEventListener('click', () => closeEditor(false));

        // Tool properties
        document.getElementById('btn-text-add')?.addEventListener('click', handleAddText);
        document.getElementById('btn-crop-apply')?.addEventListener('click', applyCrop);
        document.getElementById('btn-crop-cancel')?.addEventListener('click', () => deactivateTool('crop'));
        document.getElementById('crop-aspect-ratio')?.addEventListener('change', () => {
            if (toolState.activeTool === 'crop') handleCropTool();
        });

        // Filters
        document.getElementById('btn-apply-filters')?.addEventListener('click', applyFiltersToImage);
        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            resetFilterControls();
            drawCanvas();
        });

        // Slider value updates
        ['brightness', 'contrast', 'saturation'].forEach(key => {
            const slider = document.getElementById(`filter-${key}`);
            const valueEl = document.getElementById(`filter-${key}-value`);
            slider?.addEventListener('input', (e) => {
                if (valueEl) valueEl.textContent = e.target.value;
                updateFilterState(key, e.target.value);
            });
        });

        ['draw-brush-size', 'draw-opacity', 'eraser-size', 'text-size'].forEach(id => {
            const slider = document.getElementById(id);
            const valueEl = document.getElementById(`${id}-value`);
            slider?.addEventListener('input', (e) => {
                if (valueEl) {
                    const suffix = id.includes('opacity') ? '%' : 'px';
                    valueEl.textContent = e.target.value + suffix;
                }
            });
        });

        // AI tools
        document.getElementById('btn-auto-enhance')?.addEventListener('click', handleAutoEnhance);

        // AI Prompt Bar
        setupAIPromptBar();

        // Export
        document.getElementById('btn-export')?.addEventListener('click', handleExport);
        document.getElementById('btn-copy-clipboard')?.addEventListener('click', handleCopyToClipboard);

        // Theme toggle
        document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);

        // Sidebar toggle (mobile)
        document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
        document.getElementById('sidebar-close')?.addEventListener('click', toggleSidebar);
        document.getElementById('sidebar-overlay')?.addEventListener('click', toggleSidebar);

        // Window resize
        window.addEventListener('resize', handleWindowResize);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);

        console.log('✅ Event listeners ready');
    }

    // ─────────────────────────────────────────────
    // ✨ Text Templates System
    // ─────────────────────────────────────────────
    const textTemplates = [
        {
            id: 'lifehack',
            name: 'Life Hack',
            style: 'lifehack',
            defaultLine1: 'Life',
            defaultLine2: 'HACK'
        },
        {
            id: 'boldmoves',
            name: 'Bold Moves',
            style: 'boldmoves',
            defaultLine1: 'BOLD',
            defaultLine2: 'moves'
        },
        {
            id: 'hipster',
            name: 'Hipster',
            style: 'hipster',
            defaultLine1: 'Hipster',
            defaultLine2: 'BRAND'
        },
        {
            id: 'makeitpop',
            name: 'Make It Pop',
            style: 'makeitpop',
            defaultLine1: 'MAKE IT',
            defaultLine2: 'POP'
        },
        {
            id: 'screenbreak',
            name: 'Screen Break',
            style: 'screenbreak',
            defaultLine1: 'SCREEN',
            defaultLine2: 'BREAK'
        },
        {
            id: 'lovely',
            name: 'Lovely',
            style: 'lovely',
            defaultLine1: 'lovely',
            defaultLine2: ''
        },
        {
            id: 'latenight',
            name: 'Late Night',
            style: 'latenight',
            defaultLine1: 'Late',
            defaultLine2: 'NIGHT'
        },
        {
            id: 'colorshadow',
            name: 'Color Shadow',
            style: 'colorshadow',
            defaultLine1: 'COLOR',
            defaultLine2: 'SHADOW'
        },
        {
            id: 'vibe',
            name: 'Vibe',
            style: 'vibe',
            defaultLine1: 'VIBE',
            defaultLine2: ''
        },
        {
            id: 'future',
            name: 'Future Ready',
            style: 'future',
            defaultLine1: 'FUTURE',
            defaultLine2: 'READY'
        },
        {
            id: 'energy',
            name: 'Great Energy',
            style: 'energy',
            defaultLine1: 'Great',
            defaultLine2: 'ENERGY'
        },
        {
            id: 'streaming',
            name: 'Streaming Now',
            style: 'streaming',
            defaultLine1: 'Streaming',
            defaultLine2: 'NOW'
        },
        // E-commerce Templates
        {
            id: 'sale',
            name: 'Sale',
            style: 'sale',
            defaultLine1: 'SALE',
            defaultLine2: '50% OFF'
        },
        {
            id: 'newarrival',
            name: 'New Arrival',
            style: 'newarrival',
            defaultLine1: 'NEW',
            defaultLine2: 'ARRIVAL'
        },
        {
            id: 'limited',
            name: 'Limited Edition',
            style: 'limited',
            defaultLine1: 'LIMITED',
            defaultLine2: 'EDITION'
        },
        {
            id: 'bestseller',
            name: 'Best Seller',
            style: 'bestseller',
            defaultLine1: '#1',
            defaultLine2: 'BEST SELLER'
        },
        {
            id: 'hotdeal',
            name: 'Hot Deal',
            style: 'hotdeal',
            defaultLine1: '🔥 HOT',
            defaultLine2: 'DEAL'
        },
        {
            id: 'freeship',
            name: 'Free Shipping',
            style: 'freeship',
            defaultLine1: 'FREE',
            defaultLine2: 'SHIPPING'
        },
        {
            id: 'clearance',
            name: 'Clearance',
            style: 'clearance',
            defaultLine1: 'CLEARANCE',
            defaultLine2: 'MUST GO!'
        },
        {
            id: 'exclusive',
            name: 'Exclusive',
            style: 'exclusive',
            defaultLine1: '★ EXCLUSIVE ★',
            defaultLine2: 'OFFER'
        }
    ];

    let selectedTemplate = null;

    function loadTextTemplates() {
        const gallery = document.getElementById('text-template-gallery');
        if (!gallery) return;

        gallery.innerHTML = '';

        textTemplates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.dataset.templateId = template.id;
            item.onclick = () => openTemplateEditor(template);
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.onkeydown = (e) => { if (e.key === 'Enter') openTemplateEditor(template); };

            const preview = document.createElement('div');
            preview.className = `template-item-preview template-style-${template.style}`;

            const line1 = document.createElement('span');
            line1.className = 'line-1';
            line1.textContent = template.defaultLine1;

            const line2 = document.createElement('span');
            line2.className = 'line-2';
            line2.textContent = template.defaultLine2;

            preview.appendChild(line1);
            if (template.defaultLine2) preview.appendChild(line2);
            item.appendChild(preview);
            gallery.appendChild(item);
        });
    }

    function openTemplateEditor(template) {
        selectedTemplate = template;
        const modal = document.getElementById('template-editor-modal');
        const line1Input = document.getElementById('template-line-1');
        const line2Input = document.getElementById('template-line-2');
        const previewBox = document.getElementById('template-preview-box');

        if (!modal) return;

        // Set default values
        line1Input.value = template.defaultLine1;
        line2Input.value = template.defaultLine2;

        // Update preview
        updateTemplatePreview();

        // Show modal
        modal.style.display = 'flex';

        // Focus first input
        setTimeout(() => line1Input.focus(), 100);
    }

    function closeTemplateEditor() {
        const modal = document.getElementById('template-editor-modal');
        if (modal) modal.style.display = 'none';
        selectedTemplate = null;
    }

    function updateTemplatePreview() {
        if (!selectedTemplate) return;

        const previewBox = document.getElementById('template-preview-box');
        const line1 = document.getElementById('template-line-1')?.value || '';
        const line2 = document.getElementById('template-line-2')?.value || '';

        if (!previewBox) return;

        previewBox.innerHTML = '';
        previewBox.className = `template-preview-box template-style-${selectedTemplate.style}`;

        const span1 = document.createElement('span');
        span1.className = 'line-1';
        span1.textContent = line1 || selectedTemplate.defaultLine1;
        previewBox.appendChild(span1);

        if (line2 || selectedTemplate.defaultLine2) {
            const span2 = document.createElement('span');
            span2.className = 'line-2';
            span2.textContent = line2 || selectedTemplate.defaultLine2;
            previewBox.appendChild(span2);
        }
    }

    function applyTextTemplate() {
        if (!selectedTemplate || !state.canvas || !state.ctx) return;

        const line1 = document.getElementById('template-line-1')?.value || selectedTemplate.defaultLine1;
        const line2 = document.getElementById('template-line-2')?.value || selectedTemplate.defaultLine2;

        // Create a temporary canvas to render the text template as an image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Size for the text sticker
        const width = Math.min(state.canvas.width * 0.6, 400);
        const height = width * 0.4;

        tempCanvas.width = width;
        tempCanvas.height = height;

        // Get template styling
        const styles = getTemplateStyles(selectedTemplate.style, width, height);

        // Clear with transparency
        tempCtx.clearRect(0, 0, width, height);

        // Draw line 1
        tempCtx.font = styles.line1.font;
        tempCtx.fillStyle = styles.line1.color;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';

        if (styles.line1.shadow) {
            tempCtx.shadowColor = styles.line1.shadow.color;
            tempCtx.shadowBlur = styles.line1.shadow.blur;
            tempCtx.shadowOffsetX = styles.line1.shadow.x;
            tempCtx.shadowOffsetY = styles.line1.shadow.y;
        }

        const line1Y = line2 ? height * 0.35 : height * 0.5;
        tempCtx.fillText(line1, width / 2, line1Y);

        // Reset shadow
        tempCtx.shadowColor = 'transparent';
        tempCtx.shadowBlur = 0;
        tempCtx.shadowOffsetX = 0;
        tempCtx.shadowOffsetY = 0;

        // Draw line 2 if exists
        if (line2) {
            tempCtx.font = styles.line2.font;
            tempCtx.fillStyle = styles.line2.color;

            if (styles.line2.shadow) {
                tempCtx.shadowColor = styles.line2.shadow.color;
                tempCtx.shadowBlur = styles.line2.shadow.blur;
                tempCtx.shadowOffsetX = styles.line2.shadow.x;
                tempCtx.shadowOffsetY = styles.line2.shadow.y;
            }

            tempCtx.fillText(line2, width / 2, height * 0.65);
        }

        // Convert to image and add as sticker
        const dataUrl = tempCanvas.toDataURL('image/png');
        addSticker(dataUrl);

        closeTemplateEditor();
        showToast('Text template added!', 'success');
    }

    function getTemplateStyles(style, width, height) {
        const baseSize = Math.min(width, height) * 0.25;

        const styles = {
            lifehack: {
                line1: { font: `italic ${baseSize * 0.7}px Georgia`, color: '#333333' },
                line2: { font: `bold ${baseSize}px Impact`, color: '#2d3748' }
            },
            boldmoves: {
                line1: { font: `900 ${baseSize}px Arial Black`, color: '#1a202c' },
                line2: { font: `700 ${baseSize * 0.6}px Arial`, color: '#f97316' }
            },
            hipster: {
                line1: { font: `${baseSize}px Brush Script MT, cursive`, color: '#2d3748' },
                line2: { font: `400 ${baseSize * 0.4}px Arial`, color: '#718096' }
            },
            makeitpop: {
                line1: { font: `400 ${baseSize * 0.4}px Arial`, color: '#718096' },
                line2: { font: `900 ${baseSize * 1.2}px Arial Black`, color: '#3b82f6', shadow: { color: '#1e40af', blur: 0, x: 3, y: 3 } }
            },
            screenbreak: {
                line1: { font: `400 ${baseSize * 0.4}px Arial`, color: '#64748b' },
                line2: { font: `bold ${baseSize * 1.1}px Impact`, color: '#1e293b' }
            },
            lovely: {
                line1: { font: `${baseSize * 1.2}px Brush Script MT, cursive`, color: '#ec4899' },
                line2: { font: `${baseSize * 1.2}px Brush Script MT, cursive`, color: '#ec4899' }
            },
            latenight: {
                line1: { font: `italic ${baseSize * 0.6}px Georgia`, color: '#64748b' },
                line2: { font: `900 ${baseSize}px Arial Black`, color: '#1e293b' }
            },
            colorshadow: {
                line1: { font: `900 ${baseSize * 0.9}px Arial Black`, color: '#f97316' },
                line2: { font: `900 ${baseSize * 0.9}px Arial Black`, color: '#06b6d4', shadow: { color: 'rgba(0,0,0,0.3)', blur: 0, x: 2, y: 2 } }
            },
            vibe: {
                line1: { font: `bold ${baseSize * 1.2}px Impact`, color: '#10b981', shadow: { color: '#065f46', blur: 0, x: 2, y: 2 } },
                line2: { font: `bold ${baseSize * 1.2}px Impact`, color: '#10b981' }
            },
            future: {
                line1: { font: `700 ${baseSize * 0.9}px Arial`, color: '#8b5cf6' },
                line2: { font: `400 ${baseSize * 0.5}px Arial`, color: '#64748b' }
            },
            energy: {
                line1: { font: `italic ${baseSize * 0.6}px Georgia`, color: '#64748b' },
                line2: { font: `bold ${baseSize}px Impact`, color: '#22c55e', shadow: { color: '#15803d', blur: 0, x: 2, y: 2 } }
            },
            streaming: {
                line1: { font: `italic ${baseSize * 0.6}px Georgia`, color: '#64748b' },
                line2: { font: `900 ${baseSize}px Arial Black`, color: '#ec4899' }
            },
            // E-commerce styles
            sale: {
                line1: { font: `900 ${baseSize * 1.3}px Impact`, color: '#ef4444', shadow: { color: '#991b1b', blur: 0, x: 3, y: 3 } },
                line2: { font: `bold ${baseSize * 0.7}px Arial`, color: '#fbbf24' }
            },
            newarrival: {
                line1: { font: `700 ${baseSize * 0.8}px Arial`, color: '#10b981' },
                line2: { font: `900 ${baseSize}px Arial Black`, color: '#059669' }
            },
            limited: {
                line1: { font: `700 ${baseSize * 0.9}px Arial`, color: '#7c3aed' },
                line2: { font: `400 ${baseSize * 0.6}px Arial`, color: '#a78bfa' }
            },
            bestseller: {
                line1: { font: `900 ${baseSize * 1.4}px Impact`, color: '#f59e0b', shadow: { color: '#b45309', blur: 0, x: 2, y: 2 } },
                line2: { font: `700 ${baseSize * 0.6}px Arial`, color: '#1e293b' }
            },
            hotdeal: {
                line1: { font: `900 ${baseSize}px Arial Black`, color: '#ef4444' },
                line2: { font: `bold ${baseSize * 1.1}px Impact`, color: '#f97316', shadow: { color: '#c2410c', blur: 0, x: 2, y: 2 } }
            },
            freeship: {
                line1: { font: `900 ${baseSize}px Arial Black`, color: '#3b82f6' },
                line2: { font: `bold ${baseSize * 0.8}px Arial`, color: '#1d4ed8' }
            },
            clearance: {
                line1: { font: `900 ${baseSize * 1.1}px Impact`, color: '#dc2626', shadow: { color: '#7f1d1d', blur: 0, x: 2, y: 2 } },
                line2: { font: `bold ${baseSize * 0.6}px Arial`, color: '#fbbf24' }
            },
            exclusive: {
                line1: { font: `700 ${baseSize * 0.7}px Arial`, color: '#d4af37' },
                line2: { font: `900 ${baseSize}px Arial Black`, color: '#1e293b' }
            }
        };

        return styles[style] || styles.lifehack;
    }

    function setupTemplateListeners() {
        // Modal controls
        document.getElementById('template-modal-close')?.addEventListener('click', closeTemplateEditor);
        document.getElementById('template-cancel-btn')?.addEventListener('click', closeTemplateEditor);
        document.getElementById('template-apply-btn')?.addEventListener('click', applyTextTemplate);

        // Live preview on input
        document.getElementById('template-line-1')?.addEventListener('input', updateTemplatePreview);
        document.getElementById('template-line-2')?.addEventListener('input', updateTemplatePreview);

        // Close on backdrop click
        document.getElementById('template-editor-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'template-editor-modal') closeTemplateEditor();
        });

        // Load templates
        loadTextTemplates();
    }

    // ─────────────────────────────────────────────
    // 🤖 AI Prompt Bar System
    // ─────────────────────────────────────────────
    let isAIProcessing = false;

    function setupAIPromptBar() {
        const promptInput = document.getElementById('ai-prompt-input');
        const generateBtn = document.getElementById('btn-ai-edit');
        const suggestionChips = document.querySelectorAll('.ai-suggestion-chip');

        // Generate button click
        generateBtn?.addEventListener('click', handleAIEdit);

        // Enter key in input
        promptInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAIEdit();
            }
        });

        // Suggestion chips
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.dataset.prompt;
                if (promptInput && prompt) {
                    promptInput.value = prompt;
                    promptInput.focus();
                }
            });
        });

        console.log('✅ AI Prompt Bar ready');
    }

    async function handleAIEdit() {
        const promptInput = document.getElementById('ai-prompt-input');
        const prompt = promptInput?.value?.trim();

        if (!prompt) {
            showToast('Please enter a prompt to edit the image', 'warning');
            return;
        }

        if (isAIProcessing) {
            showToast('AI is already processing...', 'info');
            return;
        }

        if (!state.canvas || !state.baseImg) {
            showToast('No image loaded', 'error');
            return;
        }

        try {
            isAIProcessing = true;
            setAIProcessingState(true);
            showLoading('AI is editing your image...');
            updateLoadingText('Preparing image...');

            // Get current canvas as base64
            const currentImageDataUrl = state.canvas.toDataURL('image/png');

            updateLoadingText('Sending to AI...');

            // Call AI API to edit image
            const editedImageUrl = await callAIImageEdit(currentImageDataUrl, prompt);

            if (!editedImageUrl) {
                throw new Error('No image returned from AI');
            }

            updateLoadingText('Applying changes...');

            // Load the edited image
            const editedImg = await loadImage(editedImageUrl);

            // Save state before applying
            saveStateBeforeOperation('AI edit');

            // Update base image
            state.baseImg = editedImg;

            // Recalculate canvas size
            handleWindowResize();

            // Clear prompt input
            if (promptInput) promptInput.value = '';

            showToast('AI edit applied!', 'success');
            console.log('✅ AI edit completed');

        } catch (error) {
            console.error('❌ AI edit failed:', error);
            showToast('AI edit failed: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            isAIProcessing = false;
            setAIProcessingState(false);
            hideLoading();
        }
    }

    function setAIProcessingState(processing) {
        const promptBar = document.getElementById('ai-prompt-bar');
        const generateBtn = document.getElementById('btn-ai-edit');

        if (processing) {
            promptBar?.classList.add('processing');
            if (generateBtn) generateBtn.disabled = true;
        } else {
            promptBar?.classList.remove('processing');
            if (generateBtn) generateBtn.disabled = false;
        }
    }

    function updateLoadingText(text) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) loadingText.textContent = text;
    }

    async function callAIImageEdit(imageDataUrl, prompt) {
        // Get the Supabase function URL from config
        const functionUrl = typeof ExtensionConfig !== 'undefined' 
            ? ExtensionConfig.getSupabaseFunctionUrl('ai-image-edit')
            : 'https://ojxzssooylmydystjvdo.supabase.co/functions/v1/ai-image-edit';

        const apiKey = typeof ExtensionConfig !== 'undefined'
            ? ExtensionConfig.API_KEYS.SUPABASE_ANON
            : 'sb_publishable_1g365OiHn2VHRYv9GThcVA_QW2yIdyA';

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'apikey': apiKey
            },
            body: JSON.stringify({
                image: imageDataUrl,
                prompt: prompt
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', response.status, errorText);
            
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            if (response.status === 402) {
                throw new Error('AI credits exhausted. Please add more credits.');
            }
            throw new Error(`AI service error (${response.status})`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return data.editedImage || data.image || data.imageUrl;
    }

    // ─────────────────────────────────────────────
    // 🚀 Initialize
    // ─────────────────────────────────────────────
    setupEventListeners();
    setupTemplateListeners();
    setupToolDropdowns();
    notifyHostReady();

    // ─────────────────────────────────────────────
    // 🔽 Tool Dropdowns
    // ─────────────────────────────────────────────
    function setupToolDropdowns() {
        const dropdowns = document.querySelectorAll('.tool-dropdown');
        
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.tool-dropdown-trigger');
            const menu = dropdown.querySelector('.tool-dropdown-menu');
            
            if (!trigger || !menu) return;
            
            // Toggle dropdown on click
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                
                // Close all other dropdowns
                dropdowns.forEach(d => {
                    d.classList.remove('open');
                    d.querySelector('.tool-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                });
                
                // Toggle this dropdown
                if (!isOpen) {
                    dropdown.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
            
            // Close dropdown when clicking an item
            menu.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    dropdown.classList.remove('open');
                    trigger.setAttribute('aria-expanded', 'false');
                });
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tool-dropdown')) {
                dropdowns.forEach(d => {
                    d.classList.remove('open');
                    d.querySelector('.tool-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                });
            }
        });
        
        console.log('🔽 Tool dropdowns initialized');
    }

})();
