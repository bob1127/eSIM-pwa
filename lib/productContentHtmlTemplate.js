/**
 * 商品頁「產品介紹」HTML 區塊模板（inline style，供 Medusa 後台 HTML 原始碼貼上）
 * 設計規範：主色 #2D5BE3、標題 #1e293b、內文 #0f172a
 */

const ICON =
  "font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;";

export function icon(name, size = 18) {
  return `<span class="material-symbols-outlined" style="font-size:${size}px;color:#2D5BE3;${ICON}">${name}</span>`;
}

export function sectionTitle(title, iconName = "info", size = 22) {
  return `
  <div style="text-align:center;margin-bottom:28px;">
    <h3 style="margin:0;font-size:${size}px;font-weight:700;color:#1e293b;display:inline-flex;align-items:center;gap:8px;">
      ${icon(iconName, size + 2)}
      ${title}
    </h3>
    <div style="width:48px;height:3px;background:#2D5BE3;border-radius:2px;margin:10px auto 0;"></div>
  </div>`;
}

export function badge5G(label = "5G") {
  return `<span style="display:inline-block;background:#EEF3FF;color:#2D5BE3;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid #D6E4FF;">${label}</span>`;
}

export function detailCell({ iconName, label, valueHtml, borderRight = true }) {
  return `
      <div style="padding:20px 24px;${borderRight ? "border-right:1px solid #eef2f7;" : ""}">
        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
          ${icon(iconName, 18)}${label}
        </div>
        <div style="font-size:14px;color:#64748b;">${valueHtml}</div>
      </div>`;
}

/** 方案詳情：rows 為 [[left, right], ...]，fullWidth 為整列一欄 */
export function planDetailsGrid(rows, fullWidth = null) {
  const rowHtml = rows
    .map(
      ([left, right]) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #eef2f7;">
      ${detailCell({ ...left, borderRight: true })}
      ${detailCell({ ...right, borderRight: false })}
    </div>`,
    )
    .join("");

  const fullHtml = fullWidth
    ? `
    <div style="padding:20px 24px;">
      <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        ${icon(fullWidth.iconName, 18)}${fullWidth.label}
      </div>
      <div style="font-size:14px;color:#64748b;">${fullWidth.valueHtml}</div>
    </div>`
    : "";

  return `
  ${sectionTitle("方案詳情", "info")}
  <div style="background:#FFFFFF;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:40px;">
    ${rowHtml}
    ${fullHtml}
  </div>`;
}

/**
 * 方案詳情（雙欄資訊卡）：藍底白字標題 + 雙欄標籤／數值 + 全寬效期
 *
 * opts: {
 *   title,
 *   pairs: [[{ label, valueHtml, iconName? }, { label, valueHtml, iconName? }], ...],
 *   fullWidth?: { label, valueHtml }
 * }
 */
export function planDetailsSummaryCard({
  title = "方案詳情",
  pairs = [],
  fullWidth = null,
} = {}) {
  const cell = (item, { borderRight = false } = {}) => {
    if (!item) return `<div class="jeko-sum-cell"></div>`;
    const iconHtml = item.iconName
      ? `<span class="jeko-sum-cell__icon material-symbols-outlined" aria-hidden="true">${item.iconName}</span>`
      : "";
    return `
      <div class="jeko-sum-cell${borderRight ? " jeko-sum-cell--split" : ""}">
        <div class="jeko-sum-cell__label">${iconHtml}${item.label}</div>
        <div class="jeko-sum-cell__value">${item.valueHtml}</div>
      </div>`;
  };

  const pairsHtml = (pairs || [])
    .map(
      ([left, right]) => `
    <div class="jeko-sum-pair">
      ${cell(left, { borderRight: true })}
      ${cell(right)}
    </div>`,
    )
    .join("");

  const fullHtml = fullWidth
    ? `
    <div class="jeko-sum-full">
      <div class="jeko-sum-cell__label">${fullWidth.label}</div>
      <div class="jeko-sum-cell__value">${fullWidth.valueHtml}</div>
    </div>`
    : "";

  return `
  <div class="jeko-sum-plan">
    <div class="jeko-sum-card">
      <div class="jeko-sum-head">
        <h3 class="jeko-sum-title">${title}</h3>
      </div>
      <div class="jeko-sum-body">
        ${pairsHtml}
        ${fullHtml}
      </div>
    </div>
  </div>`;
}

export function planDetailsTrackCard(opts = {}) {
  const flat = [];
  for (const step of opts.steps || []) {
    for (const row of step.rows || []) {
      flat.push({
        iconName: step.iconName || "info",
        label: row.label,
        valueHtml: row.valueHtml,
      });
    }
  }
  const pairs = [];
  for (let i = 0; i < flat.length; i += 2) {
    pairs.push([flat[i], flat[i + 1] || null]);
  }
  return planDetailsSummaryCard({
    title: opts.title || "方案詳情",
    pairs,
    fullWidth: opts.footerNote
      ? { label: opts.footerNote.label, valueHtml: opts.footerNote.valueHtml }
      : null,
  });
}

export function planDetailsIrGrid(tiles, opts = {}) {
  const flat = (tiles || []).map((t) => ({
    iconName: "info",
    label: t.label,
    valueHtml: t.valueHtml,
  }));
  const pairs = [];
  for (let i = 0; i < flat.length; i += 2) {
    pairs.push([flat[i], flat[i + 1] || null]);
  }
  return planDetailsSummaryCard({
    title: opts.title || "方案詳情",
    pairs,
  });
}

export function bulletList(items) {
  const li = items
    .map(
      (text, i) => `
      <li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:${i < items.length - 1 ? "14" : "0"}px;font-size:15px;color:#0f172a;">
        <span class="material-symbols-outlined" style="font-size:20px;color:#2D5BE3;flex-shrink:0;margin-top:2px;${ICON}">check_circle</span>
        <span>${text}</span>
      </li>`,
    )
    .join("");

  return `
  <div style="background:#FFFFFF;border:1px solid #e2e8f0;border-radius:12px;padding:24px 28px;margin-bottom:32px;">
    <ul style="margin:0;padding:0;list-style:none;">${li}</ul>
  </div>`;
}

export function subsectionTitle(title, iconName = "article") {
  return `
  <h4 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;">
    ${icon(iconName, 22)}
    ${title}
  </h4>`;
}

/** 其他資訊區塊 */
export function otherInfoBlock(sections) {
  const body = sections
    .map(
      (s) => `
    <div style="margin-bottom:${s.marginBottom ?? "20"}px;">
      ${s.title ? `<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px;">${s.title}</div>` : ""}
      <div style="font-size:14px;color:#0f172a;line-height:1.75;white-space:pre-line;">${s.html}</div>
    </div>`,
    )
    .join("");

  return `
  ${sectionTitle("其他資訊", "description", 22)}
  <div style="background:#FFFFFF;border:1px solid #e2e8f0;border-radius:12px;padding:24px 28px;margin-bottom:40px;">
    ${body}
  </div>`;
}

/** 產品介紹區：標題 + 內文（可含 HTML） */
export function productIntroSection(innerHtml) {
  return `
  ${sectionTitle("產品介紹", "article", 24)}
  ${innerHtml}`;
}

export function dataTable(headers, rows, minWidth = 640) {
  const th = headers
    .map(
      (h) =>
        `<th style="padding:14px 16px;text-align:left;font-weight:600;font-size:13px;">${h}</th>`,
    )
    .join("");
  const tr = rows
    .map(
      (cells, ri) => `
        <tr style="${ri < rows.length - 1 ? "border-bottom:1px solid #eef2f7;" : ""}">
          ${cells
            .map(
              (c) =>
                `<td style="padding:16px;vertical-align:top;color:#0f172a;font-size:13px;line-height:1.7;">${c}</td>`,
            )
            .join("")}
        </tr>`,
    )
    .join("");

  return `
  <div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:${minWidth}px;background:#FFFFFF;">
      <thead>
        <tr style="background:#2D5BE3;color:#FFFFFF;">${th}</tr>
      </thead>
      <tbody>${tr}</tbody>
    </table>
  </div>`;
}

export function paragraph(text, marginBottom = 16) {
  return `<p style="margin:0 0 ${marginBottom}px;font-size:15px;color:#0f172a;line-height:1.75;">${text}</p>`;
}

/**
 * 常見問題區塊標題（含「查看更多」連結）。
 * 帶有 class="jeko-section-head"，可讓前台判斷已內含標題而隱藏預設的重複標題。
 */
export function faqSectionHead({ title, moreHref, moreLabel = "eSIM 使用教學與常見問題" }) {
  return `
  <div class="jeko-section-head" style="text-align:center;margin-bottom:28px;">
    <h2 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#1e293b;letter-spacing:-0.01em;">${title}</h2>
    ${
      moreHref
        ? `<p style="margin:0;font-size:14px;color:#94a3b8;">查看更多 <a href="${moreHref}" style="color:#2D5BE3;font-weight:600;text-decoration:underline;">${moreLabel}</a></p>`
        : ""
    }
  </div>`;
}

/**
 * 使用介紹 — 優勢 3×2 卡片格
 * items: [{ iconName, title, descHtml }]
 */
export function usageAdvantagesSection({
  title,
  subtitle = "",
  items = [],
} = {}) {
  const cards = (items || [])
    .map(
      ({ iconName, title: cardTitle, descHtml }) => `
    <div class="jeko-adv-card">
      <div class="jeko-adv-icon" aria-hidden="true">
        <span class="material-symbols-outlined">${iconName}</span>
      </div>
      <div class="jeko-adv-body">
        <h4 class="jeko-adv-title">${cardTitle}</h4>
        <p class="jeko-adv-desc">${descHtml}</p>
      </div>
    </div>`,
    )
    .join("");

  return `
  <div class="jeko-usage jeko-adv">
    <div class="jeko-section-head jeko-adv-head">
      <h3>${title}</h3>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
    <div class="jeko-adv-grid">
      ${cards}
    </div>
  </div>`;
}

/**
 * 簡約風格 FAQ 手風琴（無底色、無邊框卡片）。
 * 需搭配前台 CarrierHtmlDisplay 的 `.jeko-faq-trigger` / `.jeko-faq-item` / `.jeko-faq-panel` 綁定。
 *
 * items: [{ question: string, answerHtml: string }]
 */
export function faqAccordion(items, { defaultOpenIndex = 0 } = {}) {
  const rows = items
    .map(({ question, answerHtml }, i) => {
      const panelId = `jeko-faq-panel-${i}`;
      const isOpen = i === defaultOpenIndex;
      return `
    <div class="jeko-faq-item${isOpen ? " is-open" : ""}" data-jeko-faq-item style="background:transparent;border:none;border-radius:0;box-shadow:none;${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}">
      <h3
        class="jeko-faq-trigger"
        role="button"
        tabindex="0"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-controls="${panelId}"
        style="margin:0;padding:18px 4px;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:15px;font-weight:600;color:#1e293b;background:transparent;border:none;cursor:pointer;"
      >
        <span style="flex:1;">${question}</span>
        <span
          class="jeko-faq-icon material-symbols-outlined"
          aria-hidden="true"
          style="font-size:22px;color:#2D5BE3;flex-shrink:0;width:auto;height:auto;background:transparent;border-radius:0;box-shadow:none;line-height:1;transition:transform .3s ease;transform:rotate(${isOpen ? "180" : "0"}deg);"
          >expand_more</span
        >
      </h3>
      <div
        class="jeko-faq-panel"
        id="${panelId}"
        style="overflow:hidden;max-height:${isOpen ? "999px" : "0px"};transition:max-height .3s ease;display:block;padding:0;"
      >
        <div style="padding:0 4px 20px;font-size:14px;color:#334155;line-height:1.8;">${answerHtml}</div>
      </div>
    </div>`;
    })
    .join("");

  return `
  <div class="jeko-faq jeko-faq--minimal" style="background:transparent;border:none;border-radius:0;padding:0;box-shadow:none;">
    ${rows}
  </div>`;
}
