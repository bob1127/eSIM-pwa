/**
 * Jetpack Tiled Gallery「並排／Mosaic」排版演算法（移植自官方 ratios.js + resize 邏輯）
 * 後台 CSS  alone 不夠——寬高是 JS 依比例算出來的。
 */

export const GUTTER_WIDTH = 4;

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function isLandscape(ratio) {
  return ratio >= 1 && ratio < 2;
}

function isPortrait(ratio) {
  return ratio < 1;
}

function isPanoramic(ratio) {
  return ratio >= 2;
}

function gte(n) {
  return (m) => m >= n;
}

function lt(n) {
  return (m) => m < n;
}

function overEvery(...fns) {
  return (v) => fns.every((f) => f(v));
}

function isNotRecentShape(shape, numRecents) {
  return (recents) =>
    !recents.slice(-numRecents).some((recent) => arraysEqual(recent, shape));
}

function checkNextRatios(preds) {
  return (ratios) =>
    ratios.length >= preds.length &&
    preds.every((pred, i) => pred(ratios[i]));
}

const reverseSymmetricRowIsNotRecent = isNotRecentShape([2, 1, 2], 5);
const reverseSymmetricFitsNextImages = checkNextRatios([
  isLandscape,
  isLandscape,
  isPortrait,
  isLandscape,
  isLandscape,
]);
const longSymmetricRowFitsNextImages = checkNextRatios([
  isLandscape,
  isLandscape,
  isLandscape,
  isPortrait,
  isLandscape,
  isLandscape,
  isLandscape,
]);
const longSymmetricRowIsNotRecent = isNotRecentShape([3, 1, 3], 5);
const symmetricRowFitsNextImages = checkNextRatios([
  isPortrait,
  isLandscape,
  isLandscape,
  isPortrait,
]);
const symmetricRowIsNotRecent = isNotRecentShape([1, 2, 1], 5);
const oneThreeFitsNextImages = checkNextRatios([
  isPortrait,
  isLandscape,
  isLandscape,
  isLandscape,
]);
const oneThreeIsNotRecent = isNotRecentShape([1, 3], 3);
const threeOneIsFitsNextImages = checkNextRatios([
  isLandscape,
  isLandscape,
  isLandscape,
  isPortrait,
]);
const threeOneIsNotRecent = isNotRecentShape([3, 1], 3);
const oneTwoFitsNextImages = checkNextRatios([
  lt(1.6),
  overEvery(gte(0.9), lt(2)),
  overEvery(gte(0.9), lt(2)),
]);
const oneTwoIsNotRecent = isNotRecentShape([1, 2], 3);
const fiveIsNotRecent = isNotRecentShape([1, 1, 1, 1, 1], 1);
const fourIsNotRecent = isNotRecentShape([1, 1, 1, 1], 1);
const threeIsNotRecent = isNotRecentShape([1, 1, 1], 3);
const twoOneFitsNextImages = checkNextRatios([
  overEvery(gte(0.9), lt(2)),
  overEvery(gte(0.9), lt(2)),
  lt(1.6),
]);
const twoOneIsNotRecent = isNotRecentShape([2, 1], 3);
const panoramicFitsNextImages = checkNextRatios([isPanoramic]);

function isThreeValidCandidate(processed, toProcess, isWide) {
  const ratio = sum(toProcess.slice(0, 3));
  return (
    toProcess.length >= 3 &&
    toProcess.length !== 4 &&
    toProcess.length !== 6 &&
    threeIsNotRecent(processed) &&
    (ratio < 2.5 ||
      (ratio < 5 &&
        toProcess.length >= 3 &&
        toProcess[0] === toProcess[2]) ||
      isWide)
  );
}

function isFourValidCandidate(processed, toProcess) {
  const ratio = sum(toProcess.slice(0, 4));
  return (
    (fourIsNotRecent(processed) && ratio < 3.5 && toProcess.length > 5) ||
    (ratio < 7 && toProcess.length === 4)
  );
}

/**
 * @param {number[]} ratios width/height
 * @param {{ isWide?: boolean }} opts
 * @returns {number[][]} 每一列的欄位形狀，例如 [1,1]＝兩欄各 1 張；[2,1]＝左欄疊 2 張、右欄 1 張
 */
export function ratiosToMosaicRows(ratios, { isWide = false } = {}) {
  const go = (processed, toProcess) => {
    if (!toProcess.length) return processed;

    let next;
    if (
      toProcess.length > 15 &&
      reverseSymmetricFitsNextImages(toProcess) &&
      reverseSymmetricRowIsNotRecent(processed)
    ) {
      next = [2, 1, 2];
    } else if (
      toProcess.length > 15 &&
      longSymmetricRowFitsNextImages(toProcess) &&
      longSymmetricRowIsNotRecent(processed)
    ) {
      next = [3, 1, 3];
    } else if (
      toProcess.length !== 5 &&
      symmetricRowFitsNextImages(toProcess) &&
      symmetricRowIsNotRecent(processed)
    ) {
      next = [1, 2, 1];
    } else if (
      oneThreeFitsNextImages(toProcess) &&
      oneThreeIsNotRecent(processed)
    ) {
      next = [1, 3];
    } else if (
      threeOneIsFitsNextImages(toProcess) &&
      threeOneIsNotRecent(processed)
    ) {
      next = [3, 1];
    } else if (
      oneTwoFitsNextImages(toProcess) &&
      oneTwoIsNotRecent(processed)
    ) {
      next = [1, 2];
    } else if (
      isWide &&
      (toProcess.length === 5 ||
        (toProcess.length !== 10 && toProcess.length > 6)) &&
      fiveIsNotRecent(processed) &&
      sum(toProcess.slice(0, 5)) < 5
    ) {
      next = [1, 1, 1, 1, 1];
    } else if (isFourValidCandidate(processed, toProcess)) {
      next = [1, 1, 1, 1];
    } else if (isThreeValidCandidate(processed, toProcess, isWide)) {
      next = [1, 1, 1];
    } else if (
      twoOneFitsNextImages(toProcess) &&
      twoOneIsNotRecent(processed)
    ) {
      next = [2, 1];
    } else if (panoramicFitsNextImages(toProcess)) {
      next = [1];
    } else if (toProcess.length > 3) {
      next = [1, 1];
    } else {
      next = Array(toProcess.length).fill(1);
    }

    const consumed = sum(next);
    return go(processed.concat([next]), toProcess.slice(consumed));
  };

  return go([], ratios);
}

function adjustFit(parts, target) {
  const diff = target - parts.reduce((s, n) => s + n, 0);
  const partial = diff / parts.length;
  return parts.map((p) => p + partial);
}

function columnRatioFromAspects(aspects) {
  // aspects = width/height；與 Jetpack getColumnRatio 相同
  const invSum = aspects.reduce((s, ar) => s + 1 / ar, 0);
  const ratio = 1 / invSum;
  return [ratio, ratio * aspects.length || 1];
}

/**
 * 依容器寬度算出每張圖的像素寬高（對齊 Jetpack mosaic resize）
 * @param {number[]} aspects
 * @param {number} containerWidth
 * @param {{ isWide?: boolean, gutter?: number }} opts
 * @returns {{ rows: { cols: { items: { index: number, width: number, height: number }[] }[] }[] }}
 */
export function layoutJetpackMosaic(
  aspects,
  containerWidth,
  { isWide = false, gutter = GUTTER_WIDTH } = {},
) {
  if (!containerWidth || !aspects?.length) {
    return { rows: [] };
  }

  const safeAspects = aspects.map((a) => (a > 0.05 ? a : 1));
  const shapes = ratiosToMosaicRows(safeAspects, { isWide });
  const rows = [];
  let cursor = 0;

  shapes.forEach((shape) => {
    const colsMeta = shape.map((count) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push({
          index: cursor,
          aspect: safeAspects[cursor],
        });
        cursor += 1;
      }
      const [ratio, weighted] = columnRatioFromAspects(
        items.map((it) => it.aspect),
      );
      return { items, ratio, weighted };
    });

    const ratioSum = colsMeta.reduce((s, c) => s + c.ratio, 0);
    const weightedSum = colsMeta.reduce((s, c) => s + c.weighted, 0);
    const totalGutter = gutter * Math.max(colsMeta.length - 1, 0);
    const availableWidth = containerWidth - totalGutter;
    const rawHeight = (1 / ratioSum) * (availableWidth - weightedSum);

    const colWidths = colsMeta.map(
      (col) =>
        (rawHeight - gutter * Math.max(col.items.length - 1, 0)) * col.ratio,
    );
    const adjustedWidths = adjustFit(colWidths, availableWidth);

    const cols = colsMeta.map((col, i) => {
      const width = adjustedWidths[i];
      const rawWidth = colWidths[i];
      const colHeight =
        rawHeight - gutter * Math.max(col.items.length - 1, 0);
      const imgHeights = col.items.map((it) => rawWidth / it.aspect);
      const adjustedHeights = adjustFit(imgHeights, colHeight);

      return {
        items: col.items.map((it, j) => ({
          index: it.index,
          width,
          height: Math.max(1, adjustedHeights[j]),
        })),
      };
    });

    rows.push({ cols, height: Math.max(1, rawHeight) });
  });

  return { rows };
}

const JUSTIFIED_ROW_H = {
  sm: 200,
  md: 260,
  lg: 340,
  full: 420,
};

const JUSTIFIED_MAX_H = {
  sm: 280,
  md: 380,
  lg: 480,
  full: 560,
};

/**
 * 盡量維持原圖寬高比：同一列等高、撐滿容器寬。
 * 列高超出上限時才微裁（object-fit: cover）。
 */
/** 列切法對齊閱讀寬，手機只縮放、不改拼貼 */
const JUSTIFIED_PACK_WIDTH = 720;

export function layoutJustifiedRows(
  aspects,
  containerWidth,
  { size = "md", isWide = false, gutter = GUTTER_WIDTH } = {},
) {
  if (!containerWidth || !aspects?.length) return [];
  const key = ["sm", "md", "lg", "full"].includes(size) ? size : "md";
  let targetH = JUSTIFIED_ROW_H[key];
  let maxH = JUSTIFIED_MAX_H[key];
  if (isWide) {
    targetH = Math.round(targetH * 0.78);
    maxH = Math.round(maxH * 0.78);
  }
  const W = Math.max(1, containerWidth);
  const packW = JUSTIFIED_PACK_WIDTH;
  const safe = aspects.map((a) => (a > 0.05 ? a : 1));
  const rows = [];
  let items = [];
  let rowW = 0;

  const flush = (list) => {
    if (!list.length) return;
    const g = gutter * Math.max(list.length - 1, 0);
    const natural = list.reduce((s, it) => s + it.nw, 0) || 1;
    const fillScale = (W - g) / natural;
    const filledH = targetH * fillScale;
    if (filledH <= maxH) {
      rows.push({
        cols: list.map((it) => ({
          items: [
            {
              index: it.index,
              width: it.nw * fillScale,
              height: filledH,
            },
          ],
        })),
      });
      return;
    }
    const widths = list.map((it) => (it.nw / natural) * (W - g));
    rows.push({
      cols: list.map((it, i) => ({
        items: [
          {
            index: it.index,
            width: widths[i],
            height: maxH,
          },
        ],
      })),
    });
  };

  safe.forEach((ar, index) => {
    const nw = targetH * ar;
    const nextW = rowW + (items.length ? gutter : 0) + nw;
    if (items.length && nextW > packW) {
      flush(items);
      items = [];
      rowW = 0;
    }
    items.push({ index, nw });
    rowW += (items.length > 1 ? gutter : 0) + nw;
  });
  flush(items);
  return rows;
}
