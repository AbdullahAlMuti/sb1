// ═══════════════════════════════════════════════════════════
// Editor Tools Module - Crop, Rotate, Filters, Draw, Text, Shapes
// Works WITH existing image_editor.js without breaking it
// ═══════════════════════════════════════════════════════════

const EditorTools = (() => {
  // Tool state
  let activeTool = null;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let tempCanvas = null;
  let tempCtx = null;

  // Crop state
  let cropSelection = null;

  // Draw tool settings
  const drawSettings = {
    brushSize: 5,
    color: '#000000',
    opacity: 1.0,
    hardness: 0.8
  };

  // Text tool settings
  const textSettings = {
    font: 'Arial',
    size: 32,
    color: '#000000',
    bold: false,
    italic: false,
    rotation: 0
  };

  /**
   * Crop Tool - Allows user to select and crop area
   */
  const CropTool = {
    name: 'crop',

    /**
     * Initialize crop tool with aspect ratio options
     * @param {HTMLCanvasElement} canvas
     * @param {string} aspectRatio - '1:1', '16:9', '4:5', 'custom'
     */
    init(canvas, aspectRatio = 'custom') {
      console.log('🔲 Crop tool initialized:', aspectRatio);

      cropSelection = {
        x: canvas.width * 0.1,
        y: canvas.height * 0.1,
        width: canvas.width * 0.8,
        height: canvas.height * 0.8,
        aspectRatio
      };

      // Adjust for aspect ratio
      if (aspectRatio !== 'custom') {
        const ratio = this.getAspectRatioValue(aspectRatio);
        cropSelection.height = cropSelection.width / ratio;

        // Ensure it fits
        if (cropSelection.height > canvas.height * 0.8) {
          cropSelection.height = canvas.height * 0.8;
          cropSelection.width = cropSelection.height * ratio;
        }
      }

      return cropSelection;
    },

    getAspectRatioValue(aspectRatio) {
      const ratios = {
        '1:1': 1,
        '16:9': 16 / 9,
        '4:5': 4 / 5,
        '9:16': 9 / 16,
        '5:4': 5 / 4
      };
      return ratios[aspectRatio] || null;
    },

    /**
     * Draw crop overlay
     * @param {CanvasRenderingContext2D} ctx
     */
    drawOverlay(ctx) {
      if (!cropSelection) return;

      const canvas = ctx.canvas;

      // Darken everything except selection
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, cropSelection.y);
      ctx.fillRect(0, cropSelection.y, cropSelection.x, cropSelection.height);
      ctx.fillRect(cropSelection.x + cropSelection.width, cropSelection.y, canvas.width - cropSelection.x - cropSelection.width, cropSelection.height);
      ctx.fillRect(0, cropSelection.y + cropSelection.height, canvas.width, canvas.height - cropSelection.y - cropSelection.height);

      // Draw selection border
      ctx.strokeStyle = '#00b3ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropSelection.x, cropSelection.y, cropSelection.width, cropSelection.height);
      ctx.setLineDash([]);

      // Draw resize handles
      const handleSize = 10;
      ctx.fillStyle = '#00b3ff';
      // Corners
      ctx.fillRect(cropSelection.x - handleSize / 2, cropSelection.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropSelection.x + cropSelection.width - handleSize / 2, cropSelection.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropSelection.x - handleSize / 2, cropSelection.y + cropSelection.height - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropSelection.x + cropSelection.width - handleSize / 2, cropSelection.y + cropSelection.height - handleSize / 2, handleSize, handleSize);

      ctx.restore();
    },

    /**
     * Apply crop
     * @param {HTMLCanvasElement} canvas
     * @param {Image} baseImg
     * @returns {Image} Cropped image
     */
    async apply(canvas, baseImg) {
      if (!cropSelection) return baseImg;

      // Create temp canvas for cropping
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      // Calculate source dimensions (scale from display to actual image)
      const scaleX = baseImg.width / canvas.width;
      const scaleY = baseImg.height / canvas.height;

      const sourceX = cropSelection.x * scaleX;
      const sourceY = cropSelection.y * scaleY;
      const sourceWidth = cropSelection.width * scaleX;
      const sourceHeight = cropSelection.height * scaleY;

      tempCanvas.width = sourceWidth;
      tempCanvas.height = sourceHeight;

      // Draw cropped portion
      tempCtx.drawImage(
        baseImg,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, sourceWidth, sourceHeight
      );

      // Convert to image
      const croppedImg = new Image();
      await new Promise((resolve) => {
        croppedImg.onload = resolve;
        croppedImg.src = tempCanvas.toDataURL();
      });

      cropSelection = null;
      return croppedImg;
    }
  };

  /**
   * Rotate & Flip Tool
   */
  const RotateTool = {
    name: 'rotate',

    /**
     * Rotate image by degrees
     * @param {HTMLCanvasElement} canvas
     * @param {Image} baseImg
     * @param {number} degrees - 90, 180, 270, or custom
     * @returns {Image} Rotated image
     */
    async rotate(canvas, baseImg, degrees) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      const radians = (degrees * Math.PI) / 180;

      // Swap dimensions for 90/270 rotation
      if (degrees === 90 || degrees === 270) {
        tempCanvas.width = baseImg.height;
        tempCanvas.height = baseImg.width;
      } else {
        tempCanvas.width = baseImg.width;
        tempCanvas.height = baseImg.height;
      }

      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate(radians);
      tempCtx.drawImage(baseImg, -baseImg.width / 2, -baseImg.height / 2);

      const rotatedImg = new Image();
      await new Promise((resolve) => {
        rotatedImg.onload = resolve;
        rotatedImg.src = tempCanvas.toDataURL();
      });

      return rotatedImg;
    },

    /**
     * Flip image horizontally
     */
    async flipHorizontal(canvas, baseImg) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      tempCanvas.width = baseImg.width;
      tempCanvas.height = baseImg.height;

      tempCtx.translate(tempCanvas.width, 0);
      tempCtx.scale(-1, 1);
      tempCtx.drawImage(baseImg, 0, 0);

      const flippedImg = new Image();
      await new Promise((resolve) => {
        flippedImg.onload = resolve;
        flippedImg.src = tempCanvas.toDataURL();
      });

      return flippedImg;
    },

    /**
     * Flip image vertically
     */
    async flipVertical(canvas, baseImg) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      tempCanvas.width = baseImg.width;
      tempCanvas.height = baseImg.height;

      tempCtx.translate(0, tempCanvas.height);
      tempCtx.scale(1, -1);
      tempCtx.drawImage(baseImg, 0, 0);

      const flippedImg = new Image();
      await new Promise((resolve) => {
        flippedImg.onload = resolve;
        flippedImg.src = tempCanvas.toDataURL();
      });

      return flippedImg;
    }
  };

  /**
   * Draw/Brush Tool
   */
  const DrawTool = {
    name: 'draw',

    init(settings = {}) {
      Object.assign(drawSettings, settings);
    },

    startDrawing(ctx, x, y) {
      isDrawing = true;
      lastX = x;
      lastY = y;
    },

    draw(ctx, x, y) {
      if (!isDrawing) return;

      ctx.save();
      ctx.strokeStyle = drawSettings.color;
      ctx.lineWidth = drawSettings.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = drawSettings.opacity;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      lastX = x;
      lastY = y;
    },

    stopDrawing() {
      isDrawing = false;
    }
  };

  /**
   * Eraser Tool
   */
  const EraserTool = {
    name: 'eraser',
    size: 20,

    init(size = 20) {
      this.size = size;
    },

    startErasing(ctx, x, y) {
      isDrawing = true;
      lastX = x;
      lastY = y;
    },

    erase(ctx, x, y) {
      if (!isDrawing) return;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = this.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      lastX = x;
      lastY = y;
    },

    stopErasing() {
      isDrawing = false;
    }
  };

  /**
   * Text Tool
   */
  const TextTool = {
    name: 'text',

    init(settings = {}) {
      Object.assign(textSettings, settings);
    },

    /**
     * Add text to canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y
     */
    addText(ctx, text, x, y) {
      ctx.save();

      // Set font style
      let fontStyle = '';
      if (textSettings.italic) fontStyle += 'italic ';
      if (textSettings.bold) fontStyle += 'bold ';
      ctx.font = `${fontStyle}${textSettings.size}px ${textSettings.font}`;
      ctx.fillStyle = textSettings.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Apply rotation if needed
      if (textSettings.rotation !== 0) {
        ctx.translate(x, y);
        ctx.rotate((textSettings.rotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
      } else {
        ctx.fillText(text, x, y);
      }

      ctx.restore();
    }
  };

  /**
   * Shapes Tool
   */
  const ShapesTool = {
    name: 'shapes',

    /**
     * Draw rectangle
     */
    drawRectangle(ctx, x, y, width, height, color, filled = false) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      if (filled) {
        ctx.fillRect(x, y, width, height);
      } else {
        ctx.strokeRect(x, y, width, height);
      }

      ctx.restore();
    },

    /**
     * Draw circle
     */
    drawCircle(ctx, x, y, radius, color, filled = false) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      if (filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }

      ctx.restore();
    },

    /**
     * Draw arrow
     */
    drawArrow(ctx, fromX, fromY, toX, toY, color) {
      const headlen = 15;
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Draw arrowhead
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  };

  /**
   * Filters Tool
   */
  const FiltersTool = {
    name: 'filters',

    /**
     * Apply brightness filter
     */
    brightness(ctx, canvas, value) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + value));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Apply contrast filter
     */
    contrast(ctx, canvas, value) {
      const factor = (259 * (value + 255)) / (255 * (259 - value));
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Apply saturation filter
     */
    saturation(ctx, canvas, value) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
        data[i] = Math.min(255, Math.max(0, gray + value * (data[i] - gray)));
        data[i + 1] = Math.min(255, Math.max(0, gray + value * (data[i + 1] - gray)));
        data[i + 2] = Math.min(255, Math.max(0, gray + value * (data[i + 2] - gray)));
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Apply grayscale filter
     */
    grayscale(ctx, canvas) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Apply sepia filter
     */
    sepia(ctx, canvas) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }

      ctx.putImageData(imgData, 0, 0);
    }
  };

  /**
   * Export Tool
   */
  const ExportTool = {
    name: 'export',

    /**
     * Export canvas as data URL
     * @param {HTMLCanvasElement} canvas
     * @param {string} format - 'png', 'jpeg', 'webp'
     * @param {number} quality - 0.0 to 1.0 for lossy formats
     * @returns {string} Data URL
     */
    toDataURL(canvas, format = 'png', quality = 0.95) {
      const mimeType = `image/${format}`;

      if (format === 'png') {
        return canvas.toDataURL(mimeType);
      } else {
        return canvas.toDataURL(mimeType, quality);
      }
    },

    /**
     * Download canvas as file
     * @param {HTMLCanvasElement} canvas
     * @param {string} filename
     * @param {string} format
     * @param {number} quality
     */
    download(canvas, filename, format = 'png', quality = 0.95) {
      const dataURL = this.toDataURL(canvas, format, quality);
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = dataURL;
      link.click();
    },

    /**
     * Copy canvas to clipboard
     * @param {HTMLCanvasElement} canvas
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(canvas) {
      try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        return true;
      } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
      }
    }
  };

  /**
   * Blur & Sharpen Tool
   */
  const BlurSharpenTool = {
    name: 'blur-sharpen',

    /**
     * Apply Gaussian blur
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} radius - Blur radius (0-20)
     */
    blur(ctx, canvas, radius) {
      if (radius <= 0) return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;

      // Simple box blur (approximation of Gaussian)
      const iterations = Math.ceil(radius / 2);

      for (let iter = 0; iter < iterations; iter++) {
        // Horizontal blur
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            const blurRadius = Math.min(radius, Math.min(x, width - x - 1));

            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const idx = ((y * width) + (x + dx)) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }

            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
            data[idx + 3] = a / count;
          }
        }

        // Vertical blur
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            const blurRadius = Math.min(radius, Math.min(y, height - y - 1));

            for (let dy = -blurRadius; dy <= blurRadius; dy++) {
              const idx = (((y + dy) * width) + x) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              a += data[idx + 3];
              count++;
            }

            const idx = (y * width + x) * 4;
            data[idx] = r / count;
            data[idx + 1] = g / count;
            data[idx + 2] = b / count;
            data[idx + 3] = a / count;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Apply sharpen filter
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} strength - Sharpen strength (0-100)
     */
    sharpen(ctx, canvas, strength) {
      if (strength <= 0) return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;
      const factor = strength / 100;

      // Unsharp mask kernel
      const kernel = [
        0, -factor, 0,
        -factor, 1 + 4 * factor, -factor,
        0, -factor, 0
      ];

      const tempData = new Uint8ClampedArray(data);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let r = 0, g = 0, b = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4;
              const k = kernel[(ky + 1) * 3 + (kx + 1)];
              r += tempData[idx] * k;
              g += tempData[idx + 1] * k;
              b += tempData[idx + 2] * k;
            }
          }

          const idx = (y * width + x) * 4;
          data[idx] = Math.min(255, Math.max(0, r));
          data[idx + 1] = Math.min(255, Math.max(0, g));
          data[idx + 2] = Math.min(255, Math.max(0, b));
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }
  };

  /**
   * Advanced Color Adjustments Tool
   */
  const ColorAdjustTool = {
    name: 'color-adjust',

    /**
     * Adjust HSL (Hue, Saturation, Lightness)
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} hue - Hue shift (-180 to 180)
     * @param {number} saturation - Saturation adjustment (-100 to 100)
     * @param {number} lightness - Lightness adjustment (-100 to 100)
     */
    adjustHSL(ctx, canvas, hue, saturation, lightness) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const satFactor = (saturation + 100) / 100;
      const lightFactor = lightness / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i] / 255;
        let g = data[i + 1] / 255;
        let b = data[i + 2] / 255;

        // Convert RGB to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }

        // Adjust HSL
        h = (h + hue / 360) % 1;
        s = Math.min(1, Math.max(0, s * satFactor));
        l = Math.min(1, Math.max(0, l + lightFactor));

        // Convert HSL back to RGB
        if (s === 0) {
          r = g = b = l;
        } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
        }

        data[i] = Math.round(r * 255);
        data[i + 1] = Math.round(g * 255);
        data[i + 2] = Math.round(b * 255);
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Adjust color temperature
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} temperature - Temperature in Kelvin (2000-8000, 5500 is neutral)
     */
    adjustTemperature(ctx, canvas, temperature) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Convert temperature to RGB adjustment
      const temp = temperature / 100;
      let r, g, b;

      if (temp <= 66) {
        r = 255;
        g = temp;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        if (temp < 19) {
          b = 0;
        } else {
          b = temp - 10;
          b = 138.5177312231 * Math.log(b) - 305.0447927307;
        }
      } else {
        r = temp - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        g = temp - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        b = 255;
      }

      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));

      const rFactor = r / 255;
      const gFactor = g / 255;
      const bFactor = b / 255;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * rFactor);
        data[i + 1] = Math.min(255, data[i + 1] * gFactor);
        data[i + 2] = Math.min(255, data[i + 2] * bFactor);
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Adjust color balance (RGB channels)
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} red - Red adjustment (-100 to 100)
     * @param {number} green - Green adjustment (-100 to 100)
     * @param {number} blue - Blue adjustment (-100 to 100)
     */
    adjustColorBalance(ctx, canvas, red, green, blue) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const rFactor = (red + 100) / 100;
      const gFactor = (green + 100) / 100;
      const bFactor = (blue + 100) / 100;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] * rFactor));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * gFactor));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * bFactor));
      }

      ctx.putImageData(imgData, 0, 0);
    }
  };

  /**
   * Advanced Filters Tool
   */
  const AdvancedFiltersTool = {
    name: 'advanced-filters',

    /**
     * Apply vignette effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} intensity - Vignette intensity (0-100)
     */
    vignette(ctx, canvas, intensity) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const factor = intensity / 100;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const vignette = 1 - (dist / maxDist) * factor;

          const idx = (y * width + x) * 4;
          data[idx] = Math.max(0, Math.min(255, data[idx] * vignette));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] * vignette));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] * vignette));
        }
      }

      ctx.putImageData(imgData, 0, 0);
    },

    /**
     * Apply noise reduction (simple blur-based)
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     * @param {number} strength - Noise reduction strength (0-100)
     */
    noiseReduction(ctx, canvas, strength) {
      if (strength <= 0) return;
      // Use blur tool with reduced radius
      BlurSharpenTool.blur(ctx, canvas, strength / 10);
    }
  };

  // Public API
  return {
    CropTool,
    RotateTool,
    DrawTool,
    EraserTool,
    TextTool,
    ShapesTool,
    FiltersTool,
    BlurSharpenTool,
    ColorAdjustTool,
    AdvancedFiltersTool,
    ExportTool
  };
})();

// Make it available globally or as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EditorTools;
} else if (typeof window !== 'undefined') {
  window.editorTools = EditorTools;
}
