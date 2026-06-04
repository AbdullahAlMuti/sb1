const fs = require('fs');
const cssToAppend = `
/* ============================================================
   WIDE CLEAN SAAS DASHBOARD STYLES (NEW)
   ============================================================ */

/* 1. Panel Shell */
.panel-shell {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Common Card Style */
.product-overview-card, .titles-panel, .description-panel, .ai-prediction-panel, .bottom-action-toolbar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 2. Product Image Overview */
.product-overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.product-overview-body {
  padding: 20px;
}
.dummy-gallery {
  display: flex;
  gap: 12px;
  align-items: center;
}
.dummy-main-img {
  width: 300px;
  height: 200px;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
}
.dummy-thumb {
  width: 100px;
  height: 80px;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.dummy-more {
  width: 100px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  font-weight: 500;
}

/* 3. Main Work Grid */
.main-work-grid {
  display: grid;
  grid-template-columns: 72% 28%;
  gap: 20px;
  align-items: start;
}
@media (max-width: 1000px) {
  .main-work-grid {
    grid-template-columns: 1fr;
  }
}

/* 4. Panels Headers */
.panel-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}
.panel-heading {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.badge-blue {
  background: #eff6ff;
  color: #2563eb;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #bfdbfe;
}

/* 5. AI Generated Titles */
.selected-title-card {
  margin: 20px;
  padding: 0;
  border: 1px solid #22c55e;
  border-radius: 10px;
  background: #ffffff;
  display: flex;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.08);
  overflow: hidden;
}
.st-left {
  background: #f0fdf4;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #bbf7d0;
  width: 120px;
  flex-shrink: 0;
}
.st-icon {
  color: #16a34a;
  margin-bottom: 8px;
}
.st-match-text {
  font-size: 11px;
  font-weight: 600;
  color: #15803d;
  text-align: center;
}
.st-right {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.st-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.st-label {
  font-size: 11px;
  font-weight: 700;
  color: #16a34a;
  display: flex;
  align-items: center;
  gap: 4px;
}
.st-char-count {
  font-size: 12px;
  color: #16a34a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.st-text {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
  padding: 0;
  background: transparent;
  border: none;
}
.st-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.title-quality-badges {
  display: flex;
  gap: 8px;
}
.title-quality-badges span {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.badge-seo { background: #f0fdf4; color: #16a34a; }
.badge-converting { background: #eff6ff; color: #2563eb; }
.badge-buyer { background: #faf5ff; color: #9333ea; }

/* 6. Static Title Options */
.ai-title-options-header {
  padding: 0 20px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sort-by select {
  border: none;
  background: transparent;
  font-weight: 600;
  color: #475569;
  outline: none;
}
.ai-title-options-list {
  display: flex;
  flex-direction: column;
  padding: 0 20px;
  gap: 12px;
}
.ai-title-option-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  transition: all 0.2s;
}
.ai-title-option-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.ai-title-option-card.empty-state-ui {
  opacity: 0.7;
}
.ai-title-option-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}
.title-rank {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.rank-1 { background: #22c55e; color: #fff; }
.rank-2 { background: #3b82f6; color: #fff; }
.rank-3 { background: #a855f7; color: #fff; }

.title-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  width: 100px;
  text-align: center;
  flex-shrink: 0;
}
.badge-best { background: #f0fdf4; color: #16a34a; }
.badge-recommended { background: #eff6ff; color: #2563eb; }
.badge-alternative { background: #faf5ff; color: #9333ea; }

.title-option-text {
  flex: 1;
  font-size: 14px;
  color: #334155;
  line-height: 1.4;
  font-weight: 500;
}
.title-option-count {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  text-align: center;
  flex-shrink: 0;
  width: 60px;
}
.title-option-count span {
  font-size: 10px;
  color: #64748b;
  font-weight: 400;
}
.title-option-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ai-title-options-footer {
  padding: 16px 20px 20px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 7. Description Panel */
.description-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: calc(100% - 60px);
}
.description-preview {
  flex: 1;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  min-height: 250px;
}
.desc-empty-icon {
  color: #94a3b8;
  margin-bottom: 12px;
}
.description-empty-state h4 {
  font-size: 14px;
  color: #334155;
  margin-bottom: 8px;
}
.description-empty-state p {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 20px;
}
.description-feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}
.df-item {
  font-size: 12px;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
}
.df-item svg {
  color: #22c55e;
}
.description-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.description-actions button {
  flex: 1;
  justify-content: center;
}

/* 8. AI Prediction Panel */
.ai-prediction-panel {
  padding: 20px;
}
.pred-header {
  margin-bottom: 20px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.pred-header h4 {
  font-size: 16px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge-beta {
  background: #eff6ff;
  color: #2563eb;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}
.pred-subtitle {
  font-size: 12px;
  color: #64748b;
}
.prediction-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}
.prediction-metric-card, .prediction-score-card, .prediction-action-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}
.pm-title {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pm-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}
.pm-score {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}
.pm-label {
  font-size: 12px;
  font-weight: 600;
}
.text-green { color: #16a34a; }
.text-orange { color: #ea580c; }
.pm-bar {
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}
.pm-fill {
  height: 100%;
  border-radius: 3px;
}
.bg-green { background: #22c55e; }
.bg-orange { background: #f59e0b; }

.prediction-score-card { background: #f0fdf4; border-color: #bbf7d0; }
.ps-main { display: flex; align-items: baseline; gap: 4px; margin-bottom: 12px; }
.ps-big { font-size: 32px; font-weight: 700; color: #0f172a; }
.ps-small { font-size: 14px; color: #64748b; margin-right: 8px;}

.prediction-action-card { border-color: #22c55e; background: #ffffff; }
.pac-title { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
.pac-action { font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.pac-reason { font-size: 12px; color: #64748b; line-height: 1.4; }

/* 9. Bottom Action Toolbar */
.bottom-action-toolbar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 10px;
  flex-wrap: wrap;
}
.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  margin: 0 4px;
}

/* 10. Buttons & Inputs - SaaS style */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-solid { color: #fff; }
.btn-outline { background: transparent; }
.btn-icon { padding: 6px; }

.btn-green { background: #22c55e; }
.btn-green:hover { background: #16a34a; }
.btn-outline-green { border-color: #22c55e; color: #16a34a; }
.btn-outline-green:hover { background: #f0fdf4; }

.btn-blue { background: #3b82f6; }
.btn-blue:hover { background: #2563eb; }
.btn-outline-blue { border-color: #3b82f6; color: #2563eb; }
.btn-outline-blue:hover { background: #eff6ff; }

.btn-blue-bright { background: #0ea5e9; }
.btn-blue-bright:hover { background: #0284c7; }

.btn-teal { background: #14b8a6; }
.btn-teal:hover { background: #0d9488; }

.btn-purple { background: #a855f7; }
.btn-purple:hover { background: #9333ea; }
.btn-outline-purple { border-color: #a855f7; color: #9333ea; }
.btn-outline-purple:hover { background: #faf5ff; }

.btn-orange { background: #f97316; }
.btn-orange:hover { background: #ea580c; }

.btn-gold { background: #eab308; }
.btn-gold:hover { background: #ca8a04; }

.btn-slate { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
.btn-slate:hover { background: #e2e8f0; }

.input-inline input, .select-inline {
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
  background: #fff;
  outline: none;
  width: 100px;
}
.input-sku input { width: 140px; background: #f8fafc; }
.select-inline { padding-right: 24px; width: auto; }
.toolbar-small-btn { padding: 8px; min-width: 34px; justify-content: center; }
`;

fs.appendFileSync('ui/panel.css', cssToAppend);
console.log("Appended SaaS CSS");
