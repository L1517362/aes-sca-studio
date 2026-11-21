/* Shared layout for the two self-contained HTML documents. */
(function(root) {
  'use strict';
  const background = typeof module !== 'undefined' && module.exports
    ? require('./engineering-report-background.js')
    : root.AESEngineeringReportBackground;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const titleLines = ['AES侧信道防护对比', '与报告系统项目文档'];
  const title = titleLines.join('');
  const BASE_CSS = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #29243c;
      font: 14px/1.8 "Segoe UI", "Microsoft YaHei", sans-serif;
      background: #0a1d33;
      background-image: linear-gradient(rgba(7, 21, 36, .74), rgba(7, 21, 36, .91)), var(--report-background, none);
      background-attachment: fixed;
      background-position: center;
      background-size: cover;
    }
    main {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto 36px;
      border-radius: 16px;
      background: white;
    }
    .report-hero {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 256px;
      padding: 28px 42px;
      border-radius: 16px 16px 0 0;
      color: white;
      background: #0b2036;
      background-image: linear-gradient(90deg, #0b2036 0%, #0b2036 53%, rgba(11, 32, 54, .65) 64%, rgba(11, 32, 54, .08) 81%), var(--report-background, none);
      background-repeat: no-repeat;
      background-position: center, right center;
      background-size: 100% 100%, auto 124%;
    }
    .report-hero h1 { margin: 8px 0 14px; font-size: clamp(24px, 3.2vw, 36px); line-height: 1.35; overflow-wrap: anywhere; }
    .report-heading { max-width: 56%; overflow-wrap: anywhere; }
    .report-hero h1 span { display: block; }
    .report-kind { margin: 0; color: #9ae3ff; font-size: 16px; font-weight: 650; }
    .report-subtitle { margin: 0 0 5px; color: #e7f5ff; }
    .report-date { margin: 0; color: #c7def0; font-size: 13px; overflow-wrap: anywhere; }
    .report-content { padding: 24px 36px 36px; overflow-wrap: anywhere; }
    .printbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: min(1120px, calc(100% - 40px));
      margin: 16px auto 12px;
      color: #e3effb;
    }
    .printbar button { flex: 0 0 auto; padding: 10px 16px; color: #102740; background: #e5f3ff; border: 0; border-radius: 8px; cursor: pointer; }
    @media screen and (max-width: 760px) {
      main, .printbar { width: calc(100% - 24px); }
      .report-hero {
        min-height: 222px;
        padding: 24px;
        background-image: linear-gradient(90deg, rgba(11, 32, 54, .96), rgba(11, 32, 54, .69)), var(--report-background, none);
        background-size: 100% 100%, cover;
      }
      .report-heading { max-width: none; }
      .report-content { padding: 18px; }
    }
    @page { size: A4; margin: 16mm; }
    @media print {
      body, .report-hero { color: #29243c; background: white; }
      main { width: auto; margin: 0; }
      .report-hero { display: block; min-height: 0; padding: 0 0 12px; }
      .report-hero h1 { max-width: none; font-size: 21pt; }
      .report-hero h1 span { display: inline; }
      .report-heading { max-width: none; }
      .report-kind, .report-subtitle, .report-date { color: #29243c; }
      .report-content { padding: 0; }
      .printbar { display: none; }
    }
  `;

  // The document body and extra CSS are produced by the two report generators.
  function render({kind, titleSuffix = '', caption, subtitle = '', detail, content, css}) {
    const backgroundCSS = background ? `:root { --report-background: url("${background}"); }` : '';
    const heading = titleLines.map(line => `<span>${line}</span>`).join('');
    const subtitleHTML = subtitle ? `<p class="report-subtitle">${escapeHTML(subtitle)}</p>` : '';
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}${escapeHTML(titleSuffix)}</title>
  <style>${backgroundCSS}${BASE_CSS}${css}</style>
</head>
<body>
  <div class="printbar">
    <span>${escapeHTML(caption)}</span>
    <button onclick="window.print()">打印 / 另存为 PDF</button>
  </div>
  <main>
    <header class="report-hero">
      <div class="report-heading">
        <p class="report-kind">${escapeHTML(kind)}</p>
        <h1>${heading}</h1>
        ${subtitleHTML}
        <p class="report-date">${escapeHTML(detail)}</p>
      </div>
    </header>
    <div class="report-content">${content}</div>
  </main>
</body>
</html>`;
  }
  const api = {render};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AESReportLayout = api;
})(typeof window !== 'undefined' ? window : globalThis);
