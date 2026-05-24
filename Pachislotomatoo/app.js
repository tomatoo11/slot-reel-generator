const controlsList = document.querySelector("#controlsList");
const layoutControls = document.querySelector("#layoutControls");
const bodyImageInput = document.querySelector("#bodyImageInput");
const resetButton = document.querySelector("#resetButton");
const resetLayoutButton = document.querySelector("#resetLayoutButton");
const downloadButton = document.querySelector("#downloadButton");
const openImageButton = document.querySelector("#openImageButton");
const copyImageButton = document.querySelector("#copyImageButton");
const exportImageButton = document.querySelector("#exportImageButton");
const statusText = document.querySelector("#statusText");
const missingBlock = document.querySelector("#missingBlock");
const missingList = document.querySelector("#missingList");
const exportBlock = document.querySelector("#exportBlock");
const exportedImage = document.querySelector("#exportedImage");
const machineBadge = document.querySelector("#machineBadge");
const canvasMeta = document.querySelector("#canvasMeta");
const canvas = document.querySelector("#previewCanvas");
const previewOverlay = document.querySelector("#previewOverlay");
const ctx = canvas.getContext("2d");

const symbolMap = new Map(machineConfig.symbols.map((symbol) => [symbol.id, symbol]));
const rowLabels = ["上段", "中段", "下段"];

const state = {
  selectedRows: machineConfig.reels.map((reel) => getDefaultVisibleSymbols(reel)),
  layout: createEditableLayout(machineConfig.layout),
  assets: new Map(),
  missingAssets: [],
  isRendering: false,
  drag: null,
  cachedPngBlob: null,
  renderVersion: 0,
};

initialize();

async function initialize() {
  canvas.width = machineConfig.canvas.width;
  canvas.height = machineConfig.canvas.height;
  machineBadge.textContent = machineConfig.machineName;
  canvasMeta.textContent = `${machineConfig.canvas.width} x ${machineConfig.canvas.height}`;
  const cabinetSection = bodyImageInput ? bodyImageInput.closest(".layout-section") : null;
  const layoutSection = document.querySelector("#layoutControls")?.closest(".layout-section");
  if (cabinetSection) {
    cabinetSection.hidden = true;
  }
  if (layoutSection) {
    layoutSection.hidden = true;
  }
  if (previewOverlay) {
    previewOverlay.hidden = true;
  }
  const previewNote = document.querySelector(".preview-note");
  if (previewNote) {
    previewNote.innerHTML = "<p>現在の筐体画像向けに、リール窓へ均等に収まるよう自動調整済みです。</p><p>図柄を選ぶだけで、そのまま画像化できます。</p>";
  }

  buildControls();
  buildLayoutControls();
  buildOverlayGuides();
  syncLayoutInputs();
  await preloadAssets();
  rebuildSymbolThumbs();
  syncSymbolSelection();
  await renderPreview();

  resetButton.addEventListener("click", handleReset);
  resetLayoutButton.addEventListener("click", handleResetLayout);
  downloadButton.addEventListener("click", handleDownload);
  if (openImageButton) {
    openImageButton.addEventListener("click", handleOpenImage);
  }
  if (copyImageButton) {
    copyImageButton.addEventListener("click", handleCopyImage);
  }
  if (exportImageButton) {
    exportImageButton.addEventListener("click", handleExportImage);
  }
  if (bodyImageInput) {
    bodyImageInput.addEventListener("change", handleBodyImageChange);
  }
  previewOverlay.addEventListener("pointerdown", handleOverlayPointerDown);
  window.addEventListener("pointermove", handleOverlayPointerMove);
  window.addEventListener("pointerup", handleOverlayPointerUp);
  window.addEventListener("resize", syncOverlayGuides);
}

function buildControls() {
  controlsList.innerHTML = "";

  machineConfig.reels.forEach((reel, reelIndex) => {
    const card = document.createElement("div");
    card.className = "control-card";

    const title = document.createElement("h3");
    title.textContent = reel.label;

    const helper = document.createElement("label");
    helper.textContent = "上段・中段・下段をそれぞれ自由に選択";

    const sections = document.createElement("div");
    sections.className = "row-picker-list";

    rowLabels.forEach((rowLabel, rowIndex) => {
      const section = document.createElement("div");
      section.className = "row-picker-section";

      const sectionTitle = document.createElement("div");
      sectionTitle.className = "row-picker-title";
      sectionTitle.textContent = rowLabel;

      const grid = document.createElement("div");
      grid.className = "symbol-grid";

      machineConfig.symbols.forEach((symbol) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "symbol-button";
        button.dataset.reelIndex = String(reelIndex);
        button.dataset.rowIndex = String(rowIndex);
        button.dataset.symbolId = symbol.id;

        const thumb = document.createElement("div");
        thumb.className = "symbol-thumb";
        thumb.dataset.symbolThumb = symbol.id;
        thumb.append(createSymbolThumb(symbol.id));

        const name = document.createElement("div");
        name.className = "symbol-name";
        name.textContent = symbol.label;

        button.append(thumb, name);
        button.addEventListener("click", async () => {
          state.selectedRows[reelIndex][rowIndex] = symbol.id;
          syncSymbolSelection();
          await renderPreview();
        });

        grid.append(button);
      });

      section.append(sectionTitle, grid);
      sections.append(section);
    });

    card.append(title, helper, sections);
    controlsList.append(card);
  });
}

function buildLayoutControls() {
  layoutControls.innerHTML = "";

  state.layout.reelWindows.forEach((reelWindow, index) => {
    const card = document.createElement("div");
    card.className = "control-card";

    const title = document.createElement("h3");
    title.textContent = `${machineConfig.reels[index].label} の窓`;

    const helper = document.createElement("label");
    helper.textContent = "ドラッグでもスライダーでも調整できます";

    const rangeGrid = document.createElement("div");
    rangeGrid.className = "range-grid";

    [
      { key: "x", label: "X", min: 0, max: machineConfig.canvas.width - 40 },
      { key: "y", label: "Y", min: 0, max: machineConfig.canvas.height - 40 },
      { key: "width", label: "幅", min: 80, max: machineConfig.canvas.width },
      { key: "height", label: "高さ", min: 120, max: machineConfig.canvas.height },
    ].forEach((field) => {
      rangeGrid.append(createRangeField(index, field, reelWindow[field.key]));
    });

    card.append(title, helper, rangeGrid);
    layoutControls.append(card);
  });
}

function createRangeField(index, field, initialValue) {
  const wrapper = document.createElement("div");
  wrapper.className = "range-field";

  const label = document.createElement("label");
  label.setAttribute("for", `layout-${index}-${field.key}`);
  label.textContent = field.label;

  const value = document.createElement("span");
  value.className = "range-value";
  value.id = `layout-value-${index}-${field.key}`;
  value.textContent = String(Math.round(initialValue));
  label.append(value);

  const input = document.createElement("input");
  input.type = "range";
  input.id = `layout-${index}-${field.key}`;
  input.min = String(field.min);
  input.max = String(field.max);
  input.value = String(Math.round(initialValue));
  input.dataset.reelIndex = String(index);
  input.dataset.field = field.key;

  input.addEventListener("input", async (event) => {
    const reelIndex = Number(event.target.dataset.reelIndex);
    const property = event.target.dataset.field;
    state.layout.reelWindows[reelIndex][property] = Number(event.target.value);
    clampWindowToCanvas(state.layout.reelWindows[reelIndex]);
    syncLayoutInputs();
    syncOverlayGuides();
    await renderPreview();
  });

  wrapper.append(label, input);
  return wrapper;
}

function buildOverlayGuides() {
  previewOverlay.innerHTML = "";

  state.layout.reelWindows.forEach((_, index) => {
    const guide = document.createElement("div");
    guide.className = "reel-guide";
    guide.dataset.reelIndex = String(index);

    const label = document.createElement("div");
    label.className = "reel-guide-label";
    label.textContent = machineConfig.reels[index].label;

    const handle = document.createElement("div");
    handle.className = "reel-guide-handle";
    handle.dataset.role = "resize";

    guide.append(label, handle);
    previewOverlay.append(guide);
  });

  syncOverlayGuides();
}

async function preloadAssets() {
  const assetEntries = [
    ...machineConfig.symbols.map((symbol) => ({
      key: symbol.id,
      src: symbol.image,
      label: `${symbol.label} (${symbol.image})`,
    })),
    {
      key: "bodyImage",
      src: machineConfig.bodyImage,
      label: `筐体画像 (${machineConfig.bodyImage})`,
      optional: true,
    },
  ];

  const results = await Promise.all(
    assetEntries.map(async (entry) => {
      if (!entry.src) {
        return null;
      }

      try {
        const image = await loadImage(entry.src);
        const processedImage = entry.key === "bodyImage" ? image : safelyPrepareSymbolImage(image);
        return { ...entry, image: processedImage };
      } catch {
        if (!entry.optional) {
          state.missingAssets.push(entry.label);
        }
        return { ...entry, image: null };
      }
    }),
  );

  results.filter(Boolean).forEach((entry) => {
    state.assets.set(entry.key, entry.image);
  });

  renderMissingAssets();
}

async function renderPreview() {
  if (state.isRendering) {
    return;
  }

  state.isRendering = true;
  state.renderVersion += 1;
  state.cachedPngBlob = null;
  setStatus("画像を合成しています...");
  downloadButton.disabled = true;

  try {
    await renderSlotImage(machineConfig, state.selectedRows, {
      ctx,
      canvas,
      assets: state.assets,
      layout: state.layout,
    });
    syncOverlayGuides();
    queuePngCache(state.renderVersion);
    setStatus(
      state.missingAssets.length > 0
        ? "一部の図柄画像が未配置のため、プレースホルダー込みで表示しています。"
        : "プレビューを更新しました。",
    );
  } catch (error) {
    console.error(error);
    setStatus("プレビュー更新に失敗しました。");
  } finally {
    state.isRendering = false;
    downloadButton.disabled = false;
  }
}

async function renderSlotImage(config, selectedRows, options) {
  const { ctx: renderContext, canvas: renderCanvas, assets, layout } = options;
  const { width, height } = config.canvas;
  const { visibleRows, rowGap, reelWindows, symbolInsetX, symbolInsetY } = layout;

  renderContext.clearRect(0, 0, width, height);
  drawCabinetBase(renderContext, config, assets);

  config.reels.forEach((reel, index) => {
    const reelWindow = reelWindows[index];
    if (!reelWindow) {
      return;
    }

    const visibleSymbols = selectedRows[index];
    const centerSymbol = symbolMap.get(visibleSymbols[1]);
    const { x, y, width: reelWidth, height: reelHeight } = reelWindow;
    const symbolHeight = Math.floor((reelHeight - rowGap * (visibleRows - 1)) / visibleRows);

    drawReelFrame(renderContext, x, y, reelWidth, reelHeight, centerSymbol ? centerSymbol.accent : "#333333");

    visibleSymbols.forEach((symbolId, row) => {
      const rowY = y + row * (symbolHeight + rowGap);
      const symbol = symbolMap.get(symbolId);
      const image = assets.get(symbolId);
      const drawX = x + symbolInsetX;
      const drawY = rowY + symbolInsetY;
      const drawWidth = reelWidth - symbolInsetX * 2;
      const drawHeight = symbolHeight - symbolInsetY * 2;

      renderContext.save();
      renderContext.beginPath();
      renderContext.rect(drawX, drawY, drawWidth, drawHeight);
      renderContext.clip();

      if (image) {
        drawImageContain(renderContext, image, drawX, drawY, drawWidth, drawHeight);
      } else {
        drawPlaceholder(renderContext, drawX, drawY, drawWidth, drawHeight, symbol);
      }

      renderContext.restore();
    });
  });

  return renderCanvas;
}

function drawCabinetBase(renderContext, config, assets) {
  const bodyImage = assets.get("bodyImage");
  const { width, height } = config.canvas;

  if (bodyImage) {
    renderContext.drawImage(bodyImage, 0, 0, width, height);
    return;
  }

  const gradient = renderContext.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, config.fallbackBackground.top);
  gradient.addColorStop(1, config.fallbackBackground.bottom);
  renderContext.fillStyle = gradient;
  renderContext.fillRect(0, 0, width, height);
}

function drawReelFrame(renderContext, x, y, width, height, accentColor) {
  renderContext.strokeStyle = "rgba(0, 0, 0, 0)";
  renderContext.lineWidth = 0;
}

function drawPlaceholder(renderContext, x, y, width, height, symbol) {
  renderContext.fillStyle = symbol ? symbol.accent : "#666666";
  roundRect(renderContext, x, y, width, height, 16);
  renderContext.fill();

  renderContext.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(renderContext, x + 8, y + 8, width - 16, height - 16, 12);
  renderContext.fill();

  renderContext.fillStyle = "#fff8ef";
  renderContext.font = "700 26px 'Yu Gothic UI', sans-serif";
  renderContext.textAlign = "center";
  renderContext.textBaseline = "middle";
  renderContext.fillText(symbol ? symbol.label : "N/A", x + width / 2, y + height / 2);
}

function drawImageContain(renderContext, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const frameRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (imageRatio > frameRatio) {
    drawHeight = width / imageRatio;
    offsetY = y + (height - drawHeight) / 2;
  } else {
    drawWidth = height * imageRatio;
    offsetX = x + (width - drawWidth) / 2;
  }

  renderContext.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function roundRect(renderContext, x, y, width, height, radius) {
  renderContext.beginPath();
  renderContext.moveTo(x + radius, y);
  renderContext.arcTo(x + width, y, x + width, y + height, radius);
  renderContext.arcTo(x + width, y + height, x, y + height, radius);
  renderContext.arcTo(x, y + height, x, y, radius);
  renderContext.arcTo(x, y, x + width, y, radius);
  renderContext.closePath();
}

function renderMissingAssets() {
  if (state.missingAssets.length === 0) {
    missingBlock.hidden = true;
    return;
  }

  missingBlock.hidden = false;
  missingList.innerHTML = "";

  state.missingAssets.forEach((label) => {
    const item = document.createElement("li");
    item.textContent = label;
    missingList.append(item);
  });
}

function setStatus(message) {
  statusText.textContent = message;
}

async function handleReset() {
  state.selectedRows = machineConfig.reels.map((reel) => getDefaultVisibleSymbols(reel));
  syncSymbolSelection();
  await renderPreview();
}

async function handleResetLayout() {
  state.layout = createEditableLayout(machineConfig.layout);
  syncLayoutInputs();
  syncOverlayGuides();
  await renderPreview();
}

async function handleBodyImageChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  try {
    const image = await loadFileImage(file);
    state.assets.set("bodyImage", image);
    setStatus("筐体画像を読み込みました。");
    await renderPreview();
  } catch (error) {
    console.error(error);
    setStatus("筐体画像の読み込みに失敗しました。");
  }
}

async function handleDownload() {
  setStatus("PNGを準備しています...");
  const blob = state.cachedPngBlob || (await createPngBlob());

  if (blob && typeof window.navigator.msSaveOrOpenBlob === "function") {
    window.navigator.msSaveOrOpenBlob(blob, `${machineConfig.machineId}-${Date.now()}.png`);
    setStatus("PNGを保存しました。");
    return;
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${machineConfig.machineId}-${Date.now()}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("PNGを保存しました。");
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");
  if (!dataUrl) {
    setStatus("PNG生成に失敗しました。");
    return;
  }

  triggerDownload(dataUrl, `${machineConfig.machineId}-${Date.now()}.png`);
  setStatus("PNGを保存しました。");
}

function handleOpenImage() {
  const dataUrl = canvas.toDataURL("image/png");
  const newWindow = window.open();
  if (!newWindow) {
    setStatus("別タブを開けませんでした。ポップアップ許可を確認してください。");
    return;
  }

  newWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <title>PNG Preview</title>
        <style>
          body { margin: 0; background: #111; display: grid; place-items: center; min-height: 100vh; }
          img { max-width: 100vw; max-height: 100vh; display: block; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="PNG preview" />
      </body>
    </html>
  `);
  newWindow.document.close();
  setStatus("PNGを別タブで開きました。ブラウザの保存機能を使えます。");
}

async function handleCopyImage() {
  try {
    if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
      setStatus("このブラウザでは画像コピー未対応です。別タブ表示を使ってください。");
      return;
    }

    const blob = state.cachedPngBlob || (await createPngBlob());
    if (!blob) {
      setStatus("画像コピー用のPNG生成に失敗しました。");
      return;
    }

    await navigator.clipboard.write([
      new window.ClipboardItem({
        "image/png": blob,
      }),
    ]);
    setStatus("画像をクリップボードにコピーしました。貼り付けできます。");
  } catch (error) {
    console.error(error);
    setStatus("画像コピーに失敗しました。別タブ表示を使ってください。");
  }
}

function handleExportImage() {
  const dataUrl = canvas.toDataURL("image/png");
  if (!dataUrl) {
    setStatus("画像の書き出しに失敗しました。");
    return;
  }

  exportedImage.src = dataUrl;
  exportBlock.hidden = false;
  exportedImage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setStatus("完成画像をページ下に表示しました。右クリック保存やコピーができます。");
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

function queuePngCache(renderVersion) {
  setTimeout(async () => {
    if (renderVersion !== state.renderVersion) {
      return;
    }

    const blob = await createPngBlob();
    if (renderVersion === state.renderVersion) {
      state.cachedPngBlob = blob;
    }
  }, 0);
}

function createPngBlob() {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(resolve, "image/png");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    resolve(dataUrlToBlob(dataUrl));
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    return null;
  }

  const mimeMatch = parts[0].match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function loadFileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load selected image"));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Failed to read selected image"));
    reader.readAsDataURL(file);
  });
}

function safelyPrepareSymbolImage(image) {
  try {
    return removeNearWhiteBackground(image);
  } catch {
    return image;
  }
}

function removeNearWhiteBackground(image) {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = image.width;
  canvasElement.height = image.height;
  const context = canvasElement.getContext("2d");
  if (!context) {
    return image;
  }

  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const alpha = data[index + 3];
    const isNearWhite = r >= 245 && g >= 245 && b >= 245 && alpha >= 250;
    if (isNearWhite) {
      data[index + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvasElement;
}

function createEditableLayout(layout) {
  return {
    ...layout,
    reelWindows: layout.reelWindows.map((windowRect) => ({ ...windowRect })),
  };
}

function syncLayoutInputs() {
  state.layout.reelWindows.forEach((reelWindow, index) => {
    ["x", "y", "width", "height"].forEach((field) => {
      const input = document.querySelector(`#layout-${index}-${field}`);
      const value = document.querySelector(`#layout-value-${index}-${field}`);
      if (!input || !value) {
        return;
      }
      input.value = String(Math.round(reelWindow[field]));
      value.textContent = String(Math.round(reelWindow[field]));
    });
  });
}

function syncOverlayGuides() {
  const stageRect = previewOverlay.getBoundingClientRect();
  const scaleX = stageRect.width / machineConfig.canvas.width;
  const scaleY = stageRect.height / machineConfig.canvas.height;

  Array.from(previewOverlay.children).forEach((guide, index) => {
    const reelWindow = state.layout.reelWindows[index];
    guide.style.left = `${reelWindow.x * scaleX}px`;
    guide.style.top = `${reelWindow.y * scaleY}px`;
    guide.style.width = `${reelWindow.width * scaleX}px`;
    guide.style.height = `${reelWindow.height * scaleY}px`;
    guide.classList.toggle("is-active", Boolean(state.drag && state.drag.reelIndex === index));
  });
}

function handleOverlayPointerDown(event) {
  const guide = event.target.closest(".reel-guide");
  if (!guide) {
    return;
  }

  const reelIndex = Number(guide.dataset.reelIndex);
  const stageRect = previewOverlay.getBoundingClientRect();
  const scaleX = machineConfig.canvas.width / stageRect.width;
  const scaleY = machineConfig.canvas.height / stageRect.height;
  const mode = event.target.dataset.role === "resize" ? "resize" : "move";
  const reelWindow = state.layout.reelWindows[reelIndex];

  state.drag = {
    reelIndex,
    mode,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWindow: { ...reelWindow },
    scaleX,
    scaleY,
  };

  syncOverlayGuides();
}

async function handleOverlayPointerMove(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  const reelWindow = state.layout.reelWindows[state.drag.reelIndex];
  const deltaX = (event.clientX - state.drag.startClientX) * state.drag.scaleX;
  const deltaY = (event.clientY - state.drag.startClientY) * state.drag.scaleY;

  if (state.drag.mode === "move") {
    reelWindow.x = Math.round(state.drag.startWindow.x + deltaX);
    reelWindow.y = Math.round(state.drag.startWindow.y + deltaY);
  } else {
    reelWindow.width = Math.round(state.drag.startWindow.width + deltaX);
    reelWindow.height = Math.round(state.drag.startWindow.height + deltaY);
  }

  clampWindowToCanvas(reelWindow);
  syncLayoutInputs();
  syncOverlayGuides();
  await renderPreview();
}

function handleOverlayPointerUp(event) {
  if (!state.drag || event.pointerId !== state.drag.pointerId) {
    return;
  }

  state.drag = null;
  syncOverlayGuides();
}

function clampWindowToCanvas(reelWindow) {
  reelWindow.width = clamp(reelWindow.width, 80, machineConfig.canvas.width);
  reelWindow.height = clamp(reelWindow.height, 120, machineConfig.canvas.height);
  reelWindow.x = clamp(reelWindow.x, 0, machineConfig.canvas.width - reelWindow.width);
  reelWindow.y = clamp(reelWindow.y, 0, machineConfig.canvas.height - reelWindow.height);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createSymbolThumb(symbolId) {
  const image = state.assets.get(symbolId);
  const symbol = symbolMap.get(symbolId);

  if (image) {
    if (image instanceof HTMLCanvasElement) {
      const canvasThumb = document.createElement("canvas");
      canvasThumb.width = image.width;
      canvasThumb.height = image.height;
      canvasThumb.className = "symbol-thumb-canvas";
      const thumbContext = canvasThumb.getContext("2d");
      thumbContext.drawImage(image, 0, 0);
      return canvasThumb;
    }

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = symbol ? symbol.label : symbolId;
    return img;
  }

  const fallback = document.createElement("div");
  fallback.className = "symbol-fallback";
  fallback.style.background = symbol ? symbol.accent : "#777777";
  fallback.textContent = symbol ? symbol.label : symbolId;
  return fallback;
}

function rebuildSymbolThumbs() {
  document.querySelectorAll("[data-symbol-thumb]").forEach((container) => {
    const symbolId = container.dataset.symbolThumb;
    container.innerHTML = "";
    container.append(createSymbolThumb(symbolId));
  });
}

function syncSymbolSelection() {
  document.querySelectorAll(".symbol-button").forEach((button) => {
    const reelIndex = Number(button.dataset.reelIndex);
    const rowIndex = Number(button.dataset.rowIndex);
    const symbolId = button.dataset.symbolId;
    button.classList.toggle("is-selected", state.selectedRows[reelIndex][rowIndex] === symbolId);
  });
}

function getDefaultVisibleSymbols(reel) {
  const centerIndex = reel.strip.indexOf(reel.defaultSymbolId);
  if (centerIndex === -1) {
    return [machineConfig.symbols[0].id, machineConfig.symbols[0].id, machineConfig.symbols[0].id];
  }

  const strip = reel.strip;
  return [
    strip[(centerIndex - 1 + strip.length) % strip.length],
    strip[centerIndex],
    strip[(centerIndex + 1) % strip.length],
  ];
}
