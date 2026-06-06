const FRAME_SECONDS = 5;
const DURATION_OPTIONS = [20, 40, 60, 80];
const FPS = 30;
const MAX_IMAGE_RETRIES = 3;
const MAX_SUBTITLE_CHARS = 60;
const CREDIT_STORAGE_KEY = "storyframe_admin_credits_v3";
const STARTING_CREDITS = 1000;
const SCRIPT_CREDIT_COST = 1;
const VIDEO_CREDIT_COST = 10;
let FRAME_COUNT = 4;
let WIDTH = 480;
let HEIGHT = 854;

const generateStoryBtn = document.querySelector("#generateStoryBtn");
const hearScriptBtn = document.querySelector("#hearScriptBtn");
const generateImagesBtn = document.querySelector("#generateImagesBtn");
const continueToScriptBtn = document.querySelector("#continueToScriptBtn");
const manualFramesInput = document.querySelector("#manualFramesInput");
const manualUploadStatus = document.querySelector("#manualUploadStatus");
const playBtn = document.querySelector("#playBtn");
const exportBtn = document.querySelector("#exportBtn");
const storyIdea = document.querySelector("#storyIdea");
const videoTitle = document.querySelector("#videoTitle");
const voiceStyle = document.querySelector("#voiceStyle");
const geminiVoice = document.querySelector("#geminiVoice");
const imageQuality = document.querySelector("#imageQuality");
const aiProviderInputs = document.querySelectorAll("input[name='aiProvider']");
const voiceProviderInputs = document.querySelectorAll("input[name='voiceProvider']");
const contentNicheInputs = document.querySelectorAll("input[name='contentNiche']");
const videoFormat = document.querySelector("#videoFormat");
const videoDuration = document.querySelector("#videoDuration");
const scriptLanguage = document.querySelector("#scriptLanguage");
const motionStyle = document.querySelector("#motionStyle");
const subtitleStyle = document.querySelector("#subtitleStyle");
const apiStatus = document.querySelector("#apiStatus");
const voiceStatus = document.querySelector("#voiceStatus");
const readyCount = document.querySelector("#readyCount");
const runtimeValue = document.querySelector("#runtimeValue");
const previewTitle = document.querySelector("#previewTitle");
const previewMeta = document.querySelector("#previewMeta");
const canvas = document.querySelector("#videoCanvas");
const ctx = canvas.getContext("2d");
const emptyState = document.querySelector("#emptyState");
const previewPrevBtn = document.querySelector("#previewPrevBtn");
const previewNextBtn = document.querySelector("#previewNextBtn");
const framesGrid = document.querySelector("#framesGrid");
const scriptList = document.querySelector("#scriptList");
const progressFill = document.querySelector("#progressFill");
const downloadLink = document.querySelector("#downloadLink");
const downloadStatus = document.querySelector("#downloadStatus");
const processPanel = document.querySelector("#processPanel");
const processTitle = document.querySelector("#processTitle");
const processDetail = document.querySelector("#processDetail");
const processPercent = document.querySelector("#processPercent");
const processFill = document.querySelector("#processFill");
const processSteps = document.querySelector("#processSteps");
const processClose = document.querySelector("#processClose");
const processLabel = document.querySelector("#processLabel");
const previewProgressBadge = document.querySelector("#previewProgressBadge");
const imageLightbox = document.querySelector("#imageLightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxClose = document.querySelector("#lightboxClose");
const openScriptPopupBtn = document.querySelector("#openScriptPopupBtn");
const scriptPopup = document.querySelector("#scriptPopup");
const scriptPopupClose = document.querySelector("#scriptPopupClose");
const scriptPopupList = document.querySelector("#scriptPopupList");
const popupRegenerateScript = document.querySelector("#popupRegenerateScript");
const popupUseScript = document.querySelector("#popupUseScript");
const uploadPopup = document.querySelector("#uploadPopup");
const uploadPopupClose = document.querySelector("#uploadPopupClose");
const uploadPopupTitle = document.querySelector("#uploadPopupTitle");
const uploadPopupIntro = document.querySelector("#uploadPopupIntro");
const popupUploadButtonText = document.querySelector("#popupUploadButtonText");
const popupFramesInput = document.querySelector("#popupFramesInput");
const popupUploadStatus = document.querySelector("#popupUploadStatus");
const popupUploadThumbs = document.querySelector("#popupUploadThumbs");
const popupUploadOk = document.querySelector("#popupUploadOk");
const controlPanel = document.querySelector(".control-panel");
const stagePanel = document.querySelector(".stage-panel");
const topGenerator = document.querySelector(".top-generator");
const manualUploadBar = document.querySelector(".manual-upload-bar");
const manualUploadTitle = document.querySelector("#manualUploadTitle");
const manualUploadButtonText = document.querySelector("#manualUploadButtonText");
const uploadGuideGrid = document.querySelector("#uploadGuideGrid");
const emptyStateTitle = document.querySelector("#emptyStateTitle");
const emptyStateDetail = document.querySelector("#emptyStateDetail");
const previewFrame = document.querySelector(".preview-frame");
const progressShell = document.querySelector(".progress-shell");
const stageActions = document.querySelector(".stage-actions");
const scriptPanel = document.querySelector(".script-panel");
const wizardStepButtons = document.querySelectorAll("[data-wizard-step]");
const guideBackBtn = document.querySelector("#guideBackBtn");
const guideNextBtn = document.querySelector("#guideNextBtn");
const creditBalance = document.querySelector("#creditBalance");
const frameCountChip = document.querySelector("#frameCountChip");

let frames = Array(FRAME_COUNT).fill(null);
let subtitles = [
  "The story opens as one strange sign appears before them.",
  "The main character follows the sound into deeper mystery.",
  "A hidden truth appears where nobody expected it.",
  "The final choice changes everything before night falls."
];
let isRendering = false;
let previewTimer = null;
let narrationAudio = null;
let narrationAudioUrl = "";
let frameNarrationAudios = Array(FRAME_COUNT).fill(null);
let frameNarrationAudioUrls = Array(FRAME_COUNT).fill("");
let frameDurations = Array(FRAME_COUNT).fill(FRAME_SECONDS);
let hasGeneratedScript = false;
let currentPreviewIndex = 0;
let latestProcessPercent = 0;
let processWasClosed = false;
let renderedVideoUrl = "";
let guideStep = 1;
let adminCredits = readCredits();
const nichePresets = {
  scary: {
    label: "Seram",
    title: "Cerita Seram 20 Saat",
    placeholder: "Contoh: Seorang budak dengar bunyi ketukan dari bilik kosong.",
    prompt: "Malay scary mystery content with suspense, a clean twist, and no gore."
  },
  facts: {
    label: "Fakta",
    title: "Fakta Pelik 20 Saat",
    placeholder: "Contoh: Fakta pelik tentang laut, angkasa, haiwan, atau manusia.",
    prompt: "short surprising fact content with a strong hook and clear payoff."
  },
  history: {
    label: "History",
    title: "Kisah Sejarah 20 Saat",
    placeholder: "Contoh: Satu keputusan kecil yang mengubah sejarah.",
    prompt: "short history storytelling with one dramatic moment and visual clarity."
  },
  motivation: {
    label: "Motivasi",
    title: "Motivasi Pendek 20 Saat",
    placeholder: "Contoh: Seseorang hampir menyerah sebelum mendapat satu tanda kecil.",
    prompt: "short motivational story with struggle, decision, and emotional lift."
  },
  kids: {
    label: "Kids",
    title: "Cerita Kanak-Kanak 20 Saat",
    placeholder: "Contoh: Seekor arnab kecil belajar berkongsi dengan kawan baru.",
    prompt: "safe children's story with simple lesson, warm visuals, and gentle emotion."
  },
  anime: {
    label: "Anime",
    title: "Anime Story 20 Saat",
    placeholder: "Contoh: Seorang pelajar jumpa kuasa rahsia di stesen lama.",
    prompt: "anime-inspired short story with cinematic action and emotional stakes."
  },
  islamic: {
    label: "Islamic",
    title: "Renungan Pendek 20 Saat",
    placeholder: "Contoh: Seseorang belajar sabar selepas kehilangan sesuatu kecil.",
    prompt: "respectful Islamic reminder with gentle moral reflection and no sensitive claims."
  },
  drama: {
    label: "Drama",
    title: "Drama Pendek 20 Saat",
    placeholder: "Contoh: Seorang anak menemui surat lama daripada ibunya.",
    prompt: "short emotional drama with a human conflict and heartfelt ending."
  }
};

function init() {
  setFrameCount(getFrameCountFromDuration(), { preserveStory: true, silent: true });
  applyVideoFormat();
  applySelectedNiche({ forceTitle: false });
  renderFrameSlots();
  renderScriptList();
  renderUploadGuide();
  drawPlaceholder();
  syncUi();

  if (generateStoryBtn) generateStoryBtn.addEventListener("click", generateStory);
  if (continueToScriptBtn) continueToScriptBtn.addEventListener("click", () => setGuideStep(2));
  if (guideBackBtn) guideBackBtn.addEventListener("click", () => setGuideStep(Math.max(1, guideStep - 1)));
  if (guideNextBtn) guideNextBtn.addEventListener("click", handleGuideNext);
  if (hearScriptBtn) hearScriptBtn.addEventListener("click", hearScript);
  if (generateImagesBtn) generateImagesBtn.addEventListener("click", generateAiImages);
  if (manualFramesInput) manualFramesInput.addEventListener("change", handleManualUpload);
  playBtn.addEventListener("click", previewVideo);
  exportBtn.addEventListener("click", exportVideo);
  downloadLink.addEventListener("click", markDownloadStarted);
  aiProviderInputs.forEach(input => input.addEventListener("change", checkApiStatus));
  if (processClose) processClose.addEventListener("click", () => {
    processWasClosed = true;
    processPanel.hidden = true;
    updatePreviewProgressBadge();
  });
  canvas.addEventListener("click", () => openFrameLightbox(currentPreviewIndex));
  if (previewPrevBtn) previewPrevBtn.addEventListener("click", () => stepPreviewFrame(-1));
  if (previewNextBtn) previewNextBtn.addEventListener("click", () => stepPreviewFrame(1));
  if (previewProgressBadge) previewProgressBadge.addEventListener("click", () => {
    processWasClosed = false;
    processPanel.hidden = false;
    updatePreviewProgressBadge();
  });
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (imageLightbox) imageLightbox.addEventListener("click", (event) => {
    if (event.target === imageLightbox) closeLightbox();
  });
  if (openScriptPopupBtn) openScriptPopupBtn.addEventListener("click", openScriptPopup);
  if (scriptPopupClose) scriptPopupClose.addEventListener("click", closeScriptPopup);
  if (scriptPopup) scriptPopup.addEventListener("click", (event) => {
    if (event.target === scriptPopup) closeScriptPopup();
  });
  if (popupUseScript) popupUseScript.addEventListener("click", useScriptPopup);
  if (uploadPopupClose) uploadPopupClose.addEventListener("click", closeUploadPopup);
  if (uploadPopup) uploadPopup.addEventListener("click", (event) => {
    if (event.target === uploadPopup) closeUploadPopup();
  });
  if (popupFramesInput) popupFramesInput.addEventListener("change", handlePopupUpload);
  if (popupUploadOk) popupUploadOk.addEventListener("click", confirmPopupUpload);
  if (popupRegenerateScript) popupRegenerateScript.addEventListener("click", async () => {
    popupRegenerateScript.textContent = "Writing...";
    popupRegenerateScript.disabled = true;
    await generateStory({ openPopup: true, force: true });
    popupRegenerateScript.textContent = "Regenerate Script";
    popupRegenerateScript.disabled = false;
  });
  videoTitle.addEventListener("input", () => {
    previewTitle.textContent = videoTitle.value || "Untitled Story";
    if (!hasAnyFrame()) drawPlaceholder();
  });
  videoFormat.addEventListener("change", () => {
    applyVideoFormat();
    drawScene(getCurrentFrameFromProgress(), 0.35);
    syncUi();
  });
  if (videoDuration) videoDuration.addEventListener("change", () => {
    setFrameCount(getFrameCountFromDuration(), { preserveStory: hasGeneratedScript });
    renderScriptList();
    renderFrameSlots();
    renderUploadGuide();
    drawPlaceholder();
    syncUi();
  });
  voiceProviderInputs.forEach(input => input.addEventListener("change", () => {
    clearNarrationCache();
    updateVoiceStatus();
  }));
  contentNicheInputs.forEach(input => input.addEventListener("change", () => applySelectedNiche({ forceTitle: true })));
  voiceStyle.addEventListener("change", () => {
    clearNarrationCache();
  });
  if (geminiVoice) geminiVoice.addEventListener("change", () => {
    clearNarrationCache();
    updateVoiceStatus();
  });
  motionStyle.addEventListener("change", () => drawScene(getCurrentFrameFromProgress(), 0.35));
  subtitleStyle.addEventListener("change", () => drawScene(getCurrentFrameFromProgress(), 0.35));
  wizardStepButtons.forEach(button => {
    button.addEventListener("click", () => {
      const requestedStep = Number(button.dataset.wizardStep || 1);
      if (canOpenGuideStep(requestedStep)) setGuideStep(requestedStep);
    });
  });

  if (new URLSearchParams(window.location.search).get("demo") === "1") {
    loadDemoFrames();
  }
  checkApiStatus();
  setGuideStep(1);
}

function getFrameCountFromDuration() {
  const selectedDuration = Number(videoDuration?.value || 20);
  const safeDuration = DURATION_OPTIONS.includes(selectedDuration) ? selectedDuration : 20;
  return Math.max(1, Math.round(safeDuration / FRAME_SECONDS));
}

function getSelectedDuration() {
  return FRAME_COUNT * FRAME_SECONDS;
}

function createDefaultSubtitle(index) {
  const malayLines = [
    "Cerita bermula dengan satu tanda pelik.",
    "Watak utama melihat sesuatu yang berubah.",
    "Dia melangkah lebih dekat dengan berani.",
    "Satu rahsia kecil mula terbuka.",
    "Keadaan menjadi lebih tegang.",
    "Dia perlu memilih jalan seterusnya.",
    "Petunjuk baru muncul tanpa disangka.",
    "Semua mula faham perkara sebenar.",
    "Keputusan itu mengubah suasana.",
    "Harapan kecil kembali menyala.",
    "Akhirnya semuanya menjadi jelas.",
    "Cerita tamat dengan makna baru.",
    "Satu momen terakhir kekal di hati.",
    "Dunia mereka terasa berbeza.",
    "Perjalanan itu tidak sia-sia.",
    "Mereka pulang dengan jawapan."
  ];
  const englishLines = [
    "The story begins with one strange sign.",
    "The main character sees something change.",
    "They step closer with quiet courage.",
    "A small secret starts to appear.",
    "The moment becomes more intense.",
    "They must choose the next path.",
    "A new clue appears unexpectedly.",
    "Everyone starts seeing the truth.",
    "That decision changes the mood.",
    "A small hope begins to return.",
    "At last everything becomes clear.",
    "The story ends with new meaning.",
    "One final moment stays behind.",
    "Their world now feels different.",
    "The journey was not wasted.",
    "They return with an answer."
  ];
  const bank = scriptLanguage?.value === "malay" ? malayLines : englishLines;
  return bank[index % bank.length];
}

function setFrameCount(nextCount, options = {}) {
  const safeCount = Math.max(4, Math.min(16, Number(nextCount) || 4));
  const previousCount = FRAME_COUNT;
  FRAME_COUNT = safeCount;
  frames = Array.from({ length: FRAME_COUNT }, (_, index) => frames[index] || null);
  subtitles = Array.from({ length: FRAME_COUNT }, (_, index) => subtitles[index] || createDefaultSubtitle(index));
  frameNarrationAudios = Array.from({ length: FRAME_COUNT }, (_, index) => frameNarrationAudios[index] || null);
  frameNarrationAudioUrls = Array.from({ length: FRAME_COUNT }, (_, index) => frameNarrationAudioUrls[index] || "");
  frameDurations = Array.from({ length: FRAME_COUNT }, (_, index) => frameDurations[index] || FRAME_SECONDS);
  currentPreviewIndex = Math.min(currentPreviewIndex, FRAME_COUNT - 1);
  if (previousCount !== FRAME_COUNT && !options.silent) {
    clearDownloadReady();
    clearNarrationCache();
    progressFill.style.width = "0";
    if (!options.preserveStory) {
      hasGeneratedScript = false;
      subtitles = Array.from({ length: FRAME_COUNT }, (_, index) => createDefaultSubtitle(index));
    }
    manualUploadStatus.textContent = `Duration set to ${getSelectedDuration()} seconds. Upload ${FRAME_COUNT} images.`;
  }
}

function applyVideoFormat() {
  const isPortrait = videoFormat.value === "portrait";
  WIDTH = isPortrait ? 480 : 854;
  HEIGHT = isPortrait ? 854 : 480;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const previewFrame = document.querySelector(".preview-frame");
  previewFrame.style.aspectRatio = `${WIDTH} / ${HEIGHT}`;
  previewFrame.classList.toggle("portrait-preview", isPortrait);
  previewFrame.classList.toggle("landscape-preview", !isPortrait);
}

function canOpenGuideStep(step) {
  if (step <= 2) return true;
  if (step === 3) return hasGeneratedScript;
  if (step === 4) return frames.filter(Boolean).length === FRAME_COUNT;
  if (step === 5) return Boolean(renderedVideoUrl);
  return false;
}

async function handleGuideNext() {
  if (guideStep === 1) {
    setGuideStep(2);
    return;
  }
  if (guideStep === 2) {
    if (hasGeneratedScript) setGuideStep(3);
    return;
  }
  if (guideStep === 3) {
    if (frames.filter(Boolean).length === FRAME_COUNT) setGuideStep(4);
    return;
  }
  if (guideStep === 4) {
    if (frames.filter(Boolean).length === FRAME_COUNT) await exportVideo();
    return;
  }
  if (guideStep === 5 && renderedVideoUrl) return;
}

function setGuideStep(step) {
  const nextStep = Math.min(5, Math.max(1, Number(step) || 1));
  guideStep = nextStep;
  document.body.dataset.guideStep = String(guideStep);
  document.body.classList.toggle("guide-wide", guideStep > 1);

  if (controlPanel) controlPanel.hidden = guideStep !== 1;
  if (stagePanel) stagePanel.hidden = guideStep === 1;
  if (topGenerator) topGenerator.hidden = guideStep !== 2;
  if (manualUploadBar) manualUploadBar.hidden = guideStep !== 3;
  if (previewFrame) previewFrame.hidden = guideStep < 4;
  if (progressShell) progressShell.hidden = guideStep < 4;
  if (stageActions) stageActions.hidden = guideStep < 4;
  if (playBtn) playBtn.hidden = guideStep < 4;
  updateScriptPanelVisibility();
  renderUploadGuide();
  updateGuideNav();

  wizardStepButtons.forEach(button => {
    const buttonStep = Number(button.dataset.wizardStep || 1);
    button.classList.toggle("active", buttonStep === guideStep);
    button.classList.toggle("done", canOpenGuideStep(buttonStep + 1) || buttonStep < guideStep);
    button.disabled = !canOpenGuideStep(buttonStep);
  });

  previewMeta.textContent = getGuideText();
}

function updateGuideNav() {
  if (guideBackBtn) guideBackBtn.disabled = guideStep <= 1;
  if (!guideNextBtn) return;
  guideNextBtn.hidden = guideStep === 5 && Boolean(renderedVideoUrl);
  guideNextBtn.textContent = {
    1: "Next: Script",
    2: "Next: Images",
    3: frames.filter(Boolean).length === FRAME_COUNT ? "Next: Preview" : `Upload ${FRAME_COUNT} Images`,
    4: renderedVideoUrl ? "Next: Finish" : "Generate Video",
    5: "Download MP4"
  }[guideStep] || "Next";
  guideNextBtn.disabled =
    (guideStep === 2 && !hasGeneratedScript) ||
    (guideStep === 3 && frames.filter(Boolean).length !== FRAME_COUNT) ||
    (guideStep === 4 && frames.filter(Boolean).length !== FRAME_COUNT);
}

function updateScriptPanelVisibility() {
  const shouldShowScriptPanel = guideStep === 2 && hasGeneratedScript;
  if (scriptPanel) scriptPanel.classList.toggle("visible", shouldShowScriptPanel);
  if (scriptList) scriptList.hidden = !shouldShowScriptPanel;
}

function getGuideText() {
  const totalSeconds = Math.round(getTotalDuration());
  return {
    1: "Step 1: choose niche, enter title, then continue.",
    2: `Step 2: generate ${FRAME_COUNT} script frames for a ${getSelectedDuration()}s video.`,
    3: `Step 3: upload exactly ${FRAME_COUNT} images. Image 1 matches Script 1, Image 2 matches Script 2.`,
    4: `Step 4: preview the ${totalSeconds}s video, then generate video.`,
    5: `Step 5: video ready. Click Download MP4 to save the ${totalSeconds}s video.`
  }[guideStep] || "";
}

function renderFrameSlots(activeIndex = -1) {
  if (!framesGrid) return;
  framesGrid.innerHTML = "";
  frames.forEach((frame, index) => {
    const slot = document.createElement("div");
    slot.className = `thumb ${activeIndex === index ? "active" : ""}`;
    const number = document.createElement("span");
    number.textContent = index + 1;
    slot.append(number);
    if (frame) {
      const image = document.createElement("img");
      image.src = frame.url;
      image.alt = frame.name || `Frame ${index + 1}`;
      slot.append(image);
    }
    slot.type = "button";
    slot.addEventListener("click", () => {
      if (frames[index]) {
        drawScene(index, 0.35);
        renderFrameSlots(index);
        openFrameLightbox(index);
      }
    });
    framesGrid.append(slot);
  });
}

function renderScriptList() {
  if (!scriptList) return;
  scriptList.innerHTML = "";
  subtitles.forEach((text, index) => {
    const card = document.createElement("article");
    card.className = "script-card";
    card.innerHTML = `
      <header><span>Frame ${index + 1}</span><span>${formatTime(Math.round(getFrameStart(index)))}-${formatTime(Math.round(getFrameStart(index) + frameDurations[index]))}</span></header>
      <textarea aria-label="Subtitle for frame ${index + 1}">${text}</textarea>
      <div class="script-actions">
        <button type="button" data-action="script">Script</button>
        <button type="button" data-action="voice">Voice</button>
        <button type="button" data-action="play">Play voice</button>
      </div>
    `;
    const textarea = card.querySelector("textarea");
    textarea.addEventListener("input", () => {
      subtitles[index] = cleanNarrationText(textarea.value);
      textarea.value = subtitles[index];
      clearFrameVoiceCache(index, false);
      hasGeneratedScript = true;
      if (!isRendering && index === getCurrentFrameFromProgress()) drawScene(index, 0);
    });
    card.querySelector('[data-action="script"]').addEventListener("click", () => regenerateFrameScript(index));
    card.querySelector('[data-action="voice"]').addEventListener("click", () => regenerateFrameVoice(index));
    card.querySelector('[data-action="play"]').addEventListener("click", () => playFrameVoice(index));
    scriptList.append(card);
  });
}

function renderScriptPopupList() {
  if (!scriptPopupList) return;
  scriptPopupList.innerHTML = "";
  subtitles.forEach((text, index) => {
    const item = document.createElement("article");
    item.className = "script-popup-item";
    item.innerHTML = `
      <div class="script-popup-item-head">
        <span>Frame ${index + 1}</span>
        <div>
          <button type="button" data-action="edit" title="Edit script">Edit</button>
          <button type="button" data-action="play" title="Play voice">Play</button>
        </div>
      </div>
      <textarea aria-label="Popup script frame ${index + 1}" readonly>${text}</textarea>
    `;
    const textarea = item.querySelector("textarea");
    item.querySelector('[data-action="edit"]').addEventListener("click", () => {
      textarea.readOnly = !textarea.readOnly;
      textarea.focus();
    });
    item.querySelector('[data-action="play"]').addEventListener("click", () => {
      subtitles[index] = cleanNarrationText(textarea.value);
      textarea.value = subtitles[index];
      playFrameVoice(index);
    });
    scriptPopupList.append(item);
  });
}

function renderUploadGuide(activeIndex = -1) {
  if (!uploadGuideGrid) return;
  uploadGuideGrid.innerHTML = "";
  uploadGuideGrid.hidden = guideStep !== 3;
  subtitles.forEach((text, index) => {
    const frame = frames[index];
    const card = document.createElement("article");
    card.className = `upload-guide-card ${frame ? "ready" : ""} ${activeIndex === index ? "active" : ""}`;
    card.innerHTML = `
      <div class="upload-guide-head">
        <strong>Image ${index + 1}</strong>
        <span>${formatTime(getFrameStart(index))}-${formatTime(getFrameStart(index) + (frameDurations[index] || FRAME_SECONDS))}</span>
      </div>
      <p>${text || createDefaultSubtitle(index)}</p>
      <small>${frame ? "Image ready" : `Upload image for Script ${index + 1}`}</small>
    `;
    if (frame) {
      const image = document.createElement("img");
      image.src = frame.url;
      image.alt = frame.name || `Frame ${index + 1}`;
      card.prepend(image);
      card.addEventListener("click", () => openFrameLightbox(index));
    }
    uploadGuideGrid.append(card);
  });
}

function openScriptPopup() {
  if (!scriptPopup) return;
  renderScriptPopupList();
  scriptPopup.hidden = false;
}

function stepPreviewFrame(direction) {
  const readyIndexes = frames
    .map((frame, index) => frame ? index : -1)
    .filter(index => index >= 0);
  if (!readyIndexes.length) return;
  const currentPosition = readyIndexes.includes(currentPreviewIndex)
    ? readyIndexes.indexOf(currentPreviewIndex)
    : 0;
  const nextPosition = (currentPosition + direction + readyIndexes.length) % readyIndexes.length;
  const nextIndex = readyIndexes[nextPosition];
  stopPreview();
  drawScene(nextIndex, 0.35);
  renderFrameSlots(nextIndex);
  progressFill.style.width = `${Math.round((nextIndex / Math.max(1, FRAME_COUNT - 1)) * 100)}%`;
}

function closeScriptPopup() {
  if (!scriptPopup) return;
  scriptPopup.hidden = true;
}

function openUploadPopup() {
  if (!uploadPopup) return;
  if (popupFramesInput) popupFramesInput.value = "";
  if (popupUploadThumbs) popupUploadThumbs.innerHTML = "";
  if (popupUploadStatus) popupUploadStatus.textContent = `No images selected. Need ${FRAME_COUNT}.`;
  if (uploadPopupTitle) uploadPopupTitle.textContent = `Upload ${FRAME_COUNT} Story Images`;
  if (popupUploadButtonText) popupUploadButtonText.textContent = `Choose ${FRAME_COUNT} Images`;
  if (uploadPopupIntro) uploadPopupIntro.textContent = `Choose exactly ${FRAME_COUNT} images. Image 1 matches Script 1, Image 2 matches Script 2, and so on.`;
  if (popupUploadOk) popupUploadOk.disabled = true;
  uploadPopup.hidden = false;
}

function closeUploadPopup() {
  if (!uploadPopup) return;
  uploadPopup.hidden = true;
}

async function handlePopupUpload() {
  const files = Array.from(popupFramesInput?.files || []).slice(0, FRAME_COUNT);
  if (popupUploadThumbs) popupUploadThumbs.innerHTML = "";
  if (files.length !== FRAME_COUNT) {
    if (popupUploadStatus) popupUploadStatus.textContent = `Please choose exactly ${FRAME_COUNT} images.`;
    if (popupUploadOk) popupUploadOk.disabled = true;
    return;
  }
  try {
    const loadedFrames = await Promise.all(files.map((file, index) => fileToFrame(file, index)));
    frames = loadedFrames;
    clearDownloadReady();
    renderedVideoUrl = "";
    renderFrameSlots(0);
    syncUi();
    if (popupUploadThumbs) {
      loadedFrames.forEach((frame, index) => {
        const thumb = document.createElement("img");
        thumb.src = frame.url;
        thumb.alt = frame.name || `Frame ${index + 1}`;
        popupUploadThumbs.append(thumb);
      });
    }
    if (popupUploadStatus) popupUploadStatus.textContent = `${FRAME_COUNT} images ready.`;
    if (popupUploadOk) popupUploadOk.disabled = false;
  } catch (error) {
    if (popupUploadStatus) popupUploadStatus.textContent = error.message;
    if (popupUploadOk) popupUploadOk.disabled = true;
  }
}

function confirmPopupUpload() {
  if (frames.filter(Boolean).length !== FRAME_COUNT) return;
  closeUploadPopup();
  progressFill.style.width = "0";
  drawScene(0, 0.35);
  syncUi();
  setGuideStep(4);
}

function useScriptPopup() {
  if (!scriptPopupList) return;
  scriptPopupList.querySelectorAll("textarea").forEach((textarea, index) => {
    subtitles[index] = cleanNarrationText(textarea.value);
    clearFrameVoiceCache(index, false);
  });
  hasGeneratedScript = true;
  renderScriptList();
  drawScene(0, 0.35);
  closeScriptPopup();
  setGuideStep(2);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getFrameStart(index) {
  return frameDurations.slice(0, index).reduce((sum, duration) => sum + duration, 0);
}

function getTotalDuration() {
  return frameDurations.reduce((sum, duration) => sum + duration, 0);
}

function getFrameTiming(elapsed) {
  let start = 0;
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const duration = frameDurations[index] || FRAME_SECONDS;
    if (elapsed < start + duration || index === FRAME_COUNT - 1) {
      return {
        frameIndex: index,
        sceneProgress: Math.max(0, Math.min(1, (elapsed - start) / duration))
      };
    }
    start += duration;
  }
  return { frameIndex: FRAME_COUNT - 1, sceneProgress: 1 };
}

function getSelectedNiche() {
  return document.querySelector("input[name='contentNiche']:checked")?.value || "scary";
}

function getSelectedNichePreset() {
  return nichePresets[getSelectedNiche()] || nichePresets.scary;
}

function getAiProvider() {
  return document.querySelector("input[name='aiProvider']:checked")?.value || "google";
}

function applySelectedNiche({ forceTitle = false } = {}) {
  const preset = getSelectedNichePreset();
  if (!preset) return;
  if (storyIdea) storyIdea.placeholder = preset.placeholder;
  const currentTitle = (videoTitle.value || "").trim();
  const shouldReplaceTitle = forceTitle || !currentTitle || currentTitle === "A 24 Second Story" || currentTitle === "Cerita Seram 20 Saat";
  if (shouldReplaceTitle) {
    videoTitle.value = preset.title;
    previewTitle.textContent = preset.title;
  }
  if (!hasAnyFrame()) drawPlaceholder();
  syncUi();
}

function buildGenerationDescription() {
  const preset = getSelectedNichePreset();
  const typedIdea = storyIdea.value.trim();
  const idea = typedIdea || `AI creates a complete idea for ${preset.label} content.`;
  return `Niche: ${preset.label}. Direction: ${preset.prompt}. User idea: ${idea}`;
}

function readCredits() {
  const rawCredit = localStorage.getItem(CREDIT_STORAGE_KEY);
  const saved = Number(rawCredit);
  if (rawCredit !== null && rawCredit !== "" && Number.isFinite(saved) && saved >= 0) return Math.floor(saved);
  localStorage.setItem(CREDIT_STORAGE_KEY, String(STARTING_CREDITS));
  return STARTING_CREDITS;
}

function saveCredits() {
  localStorage.setItem(CREDIT_STORAGE_KEY, String(adminCredits));
  updateCreditUi();
}

function updateCreditUi() {
  if (!creditBalance) return;
  creditBalance.textContent = `${adminCredits} credits`;
  creditBalance.classList.toggle("low-credit", adminCredits < VIDEO_CREDIT_COST);
}

function canSpendCredits(cost, label) {
  if (adminCredits >= cost) return true;
  alert(`Not enough credits for ${label}. Need ${cost}, current balance ${adminCredits}.`);
  return false;
}

function spendCredits(cost, label) {
  if (!canSpendCredits(cost, label)) return false;
  adminCredits -= cost;
  saveCredits();
  return true;
}

function syncUi() {
  const count = frames.filter(Boolean).length;
  updateCreditUi();
  if (frameCountChip) frameCountChip.textContent = `${FRAME_COUNT} Frames`;
  if (readyCount) readyCount.textContent = `${count}/${FRAME_COUNT}`;
  if (manualUploadTitle) manualUploadTitle.textContent = `Upload ${FRAME_COUNT} Story Images`;
  if (manualUploadButtonText) {
    manualUploadButtonText.textContent = count === FRAME_COUNT ? "All Images Ready" : `Upload Image ${count + 1}`;
  }
  if (manualUploadStatus) {
    manualUploadStatus.textContent = count === FRAME_COUNT
      ? `${FRAME_COUNT} images ready. Click Next: Preview.`
      : `Upload one image at a time. Next upload fills Image ${count + 1}. ${count}/${FRAME_COUNT} ready.`;
  }
  if (emptyStateTitle) emptyStateTitle.textContent = `Upload ${FRAME_COUNT} frames`;
  if (emptyStateDetail) {
    emptyStateDetail.textContent = `${getSelectedDuration()}s video: one image per script frame, synced with subtitles and voice.`;
  }
  if (generateImagesBtn) generateImagesBtn.textContent = `Generate ${FRAME_COUNT} Images`;
  emptyState.hidden = count > 0;
  exportBtn.disabled = count !== FRAME_COUNT || isRendering || Boolean(renderedVideoUrl);
  exportBtn.hidden = Boolean(renderedVideoUrl);
  exportBtn.textContent = isRendering
    ? "Rendering..."
    : renderedVideoUrl
      ? "Video Ready"
      : "Generate Video";
  playBtn.disabled = count === 0 || isRendering;
  updateGuideNav();
  if (generateImagesBtn) generateImagesBtn.disabled = isRendering;
  if (hearScriptBtn) hearScriptBtn.disabled = isRendering || !hasGeneratedScript;
  previewMeta.textContent = getGuideText();
  previewTitle.textContent = videoTitle.value || "Untitled Story";
  if (runtimeValue) runtimeValue.textContent = `${Math.round(getTotalDuration())}s`;
  updateScriptPanelVisibility();
  renderUploadGuide();
}

async function checkApiStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    const provider = getAiProvider();
    const hasProviderKey = provider === "google" ? status.hasGeminiKey : status.hasKey;
    const model = provider === "google" ? status.geminiImageModel : status.model;
    apiStatus.textContent = hasProviderKey
      ? `Ready. ${provider === "google" ? "Google" : "OpenAI"} model: ${model}`
      : `Local server ready, but ${provider === "google" ? "GEMINI_API_KEY" : "OPENAI_API_KEY"} is missing.`;
    voiceStatus.dataset.hasElevenLabsKey = status.hasElevenLabsKey ? "true" : "false";
    updateVoiceStatus();
  } catch {
    apiStatus.textContent = "Run python server.py to enable direct image generation.";
    voiceStatus.textContent = "Voice server not available.";
  }
}

function updateVoiceStatus() {
  if (getVoiceProvider() === "elevenlabs") {
    voiceStatus.textContent = voiceStatus.dataset.hasElevenLabsKey === "true"
      ? "ElevenLabs voice ready for preview and export."
      : "ElevenLabs key missing in .env.";
    return;
  }
  if (getVoiceProvider() === "google") {
    voiceStatus.textContent = "Google Gemini voice selected for preview and export.";
    return;
  }
  if (getVoiceProvider() === "openai") {
    voiceStatus.textContent = "OpenAI speech selected for preview and export.";
    return;
  }
  if (getVoiceProvider() === "browser") {
    voiceStatus.textContent = "Browser preview only; export uses generated audio tones.";
    return;
  }
  voiceStatus.textContent = "Voice provider selected.";
}

function clearNarrationCache() {
  narrationAudio = null;
  if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
  narrationAudioUrl = "";
  frameNarrationAudios = Array(FRAME_COUNT).fill(null);
  frameNarrationAudioUrls.forEach(url => {
    if (url) URL.revokeObjectURL(url);
  });
  frameNarrationAudioUrls = Array(FRAME_COUNT).fill("");
}

function getVoiceProvider() {
  return document.querySelector("input[name='voiceProvider']:checked")?.value || "elevenlabs";
}

function isApiVoiceProvider() {
  return ["google", "openai", "elevenlabs"].includes(getVoiceProvider());
}

function hasAnyFrame() {
  return frames.some(Boolean);
}

function drawPlaceholder() {
  const grd = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grd.addColorStop(0, "#10242b");
  grd.addColorStop(0.55, "#173943");
  grd.addColorStop(1, "#40231f");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "800 60px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(videoTitle.value || "StoryFrame Studio", WIDTH / 2, HEIGHT / 2 - 8);
  ctx.font = "500 26px Inter, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(`Upload images and generate script/voice`, WIDTH / 2, HEIGHT / 2 + 42);
}

function drawScene(frameIndex, sceneProgress) {
  const frame = frames[frameIndex] || frames.find(Boolean);
  if (!frame) {
    drawPlaceholder();
    return;
  }
  currentPreviewIndex = frameIndex;

  const image = frame.image;
  const eased = easeInOut(sceneProgress);
  const motion = getMotion(frameIndex, eased);
  const transition = getCutTransition(frameIndex, sceneProgress);
  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height) * motion.scale;
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const x = (WIDTH - drawW) / 2 + motion.x * (drawW - WIDTH);
  const y = (HEIGHT - drawH) / 2 + motion.y * (drawH - HEIGHT);

  ctx.fillStyle = "#101820";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  if (transition.alpha < 1) ctx.globalAlpha = transition.alpha;
  ctx.drawImage(image, x, y, drawW, drawH);
  ctx.restore();

  if (transition.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${transition.flash})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const shade = ctx.createLinearGradient(0, HEIGHT * 0.42, 0, HEIGHT);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawSubtitle(subtitles[frameIndex] || "", WIDTH / 2, HEIGHT - (WIDTH < HEIGHT ? 155 : 100), sceneProgress);
}

function getMotion(frameIndex, eased) {
  const mode = getDirectedMotionMode(frameIndex);
  const direction = frameIndex % 2 === 0 ? 1 : -1;
  if (mode === "zoom-out") {
    return {
      scale: 1.11 - eased * 0.07,
      x: direction * 0.018,
      y: -direction * 0.01
    };
  }
  if (mode === "pan") {
    return {
      scale: 1.09,
      x: direction * (0.045 - eased * 0.09),
      y: -direction * (0.02 - eased * 0.04)
    };
  }
  return {
    scale: 1.03 + eased * (mode === "cinematic" ? 0.075 : 0.095),
    x: direction * (eased - 0.5) * 0.045,
    y: -direction * (eased - 0.5) * 0.026
  };
}

function getCutTransition(frameIndex, sceneProgress) {
  const mode = getDirectedMotionMode(frameIndex);
  if (mode !== "cinematic" || sceneProgress > 0.18) {
    return { alpha: 1, flash: 0 };
  }
  const t = sceneProgress / 0.18;
  return {
    alpha: 0.72 + t * 0.28,
    flash: Math.max(0, 0.2 - t * 0.2)
  };
}

function getDirectedMotionMode(frameIndex) {
  const selected = motionStyle.value;
  if (selected !== "auto") return selected;
  return ["zoom-in", "pan", "cinematic", "zoom-out"][frameIndex % FRAME_COUNT];
}

function easeInOut(value) {
  return value < 0.5
    ? 2 * value * value
    : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function drawSubtitle(text, centerX, y, sceneProgress) {
  const lines = wrapText(text, WIDTH < HEIGHT ? 25 : 42).slice(0, 3);
  const style = subtitleStyle.value === "strong" ? "strong" : "clean";
  const pop = 0.94 + Math.min(0.06, sceneProgress / 3);
  const subtitleY = y;
  const fontSize = WIDTH < HEIGHT ? 25 : 31;
  ctx.font = `${style === "strong" ? 900 : 800} ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = fontSize + 10;
  const top = subtitleY - (lines.length * lineHeight) / 2;

  ctx.globalAlpha = pop;
  lines.forEach((line, index) => {
    const textY = top + index * lineHeight;
    ctx.lineWidth = style === "strong" ? 8 : 6;
    ctx.strokeStyle = "rgba(0,0,0,0.78)";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.strokeText(line, centerX, textY);
    ctx.fillStyle = "#fff";
    ctx.fillText(line, centerX, textY);
  });
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
}

function wrapText(text, maxChars) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

async function generateStory(options = {}) {
  const shouldOpenPopup = options.openPopup !== false;
  if (isRendering && !options.force) return;
  if (!canSpendCredits(SCRIPT_CREDIT_COST, "script generation")) return;
  const userDescription = storyIdea.value.trim();
  let shouldChargeCredit = true;
  if (generateStoryBtn) {
    generateStoryBtn.textContent = "Writing script...";
    generateStoryBtn.disabled = true;
  }
  try {
    const response = await fetch("/api/generate-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: videoTitle.value,
        description: buildGenerationDescription(),
        niche: getSelectedNichePreset().label,
        provider: getAiProvider(),
        language: scriptLanguage.value,
        frameCount: FRAME_COUNT
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Frame script generation failed.");
    }
    videoTitle.value = result.title || videoTitle.value;
    if (!userDescription && result.description && !String(result.description).startsWith("Niche:")) {
      storyIdea.value = result.description;
    }
    subtitles = Array.from({ length: FRAME_COUNT }, (_, index) =>
      cleanNarrationText(String(result.frames[index] || createDefaultSubtitle(index)))
    );
    hasGeneratedScript = true;
    if (shouldChargeCredit) {
      spendCredits(SCRIPT_CREDIT_COST, "script generation");
      shouldChargeCredit = false;
    }
    apiStatus.textContent = "AI frame script ready.";
    voiceStatus.textContent = "Script ready. Click Hear Script to preview voice.";
    if (shouldOpenPopup) openScriptPopup();
  } catch (error) {
    apiStatus.textContent = `${error.message} Using local script fallback.`;
    generateLocalStory();
    hasGeneratedScript = true;
    if (shouldChargeCredit) {
      spendCredits(SCRIPT_CREDIT_COST, "script generation");
      shouldChargeCredit = false;
    }
    if (shouldOpenPopup) openScriptPopup();
  } finally {
    if (generateStoryBtn) {
      generateStoryBtn.textContent = "AI Frame Script";
      generateStoryBtn.disabled = false;
    }
    renderScriptList();
    drawScene(0, 0.35);
    syncUi();
  }
}

async function hearScript() {
  if (isRendering) return;
  if (!hasGeneratedScript) {
    await generateStory({ openPopup: true, force: true });
  }
  isRendering = true;
  if (hearScriptBtn) {
    hearScriptBtn.disabled = true;
    hearScriptBtn.textContent = "Preparing voice...";
  }
  try {
    clearNarrationCache();
    showProcess("Voice Preview", "Generating frame voices...");
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      setProcess(index, `Generating voice ${index + 1}/${FRAME_COUNT}...`, 8 + ((index + 1) / FRAME_COUNT) * 72);
      await getApiVoiceAudioUrl(index);
    }
    setProcess(FRAME_COUNT, "Playing script preview...", 100);
    hideProcessUi();
    await playNarrationPreview();
  } catch (error) {
    failProcess(error.message);
    alert(error.message);
  } finally {
    isRendering = false;
    if (hearScriptBtn) {
      hearScriptBtn.textContent = "Hear Script";
      hearScriptBtn.disabled = false;
    }
    syncUi();
  }
}

function showProcess(title = "Generating", detail = "Preparing request...") {
  processWasClosed = false;
  processPanel.hidden = false;
  processTitle.textContent = title;
  processDetail.textContent = detail;
  if (processLabel) processLabel.textContent = "Loading";
  processSteps.innerHTML = "";
  processSteps.hidden = true;
  setProcess(0, detail, 0);
}

function setProcess(stepIndex, detail, percent) {
  processDetail.textContent = detail;
  const safePercent = Math.max(0, Math.min(100, percent));
  latestProcessPercent = safePercent;
  processPercent.textContent = `${Math.round(safePercent)}%`;
  processFill.style.width = `${safePercent}%`;
  updatePreviewProgressBadge();
}

function failProcess(detail) {
  processDetail.textContent = detail;
  if (processLabel) processLabel.textContent = "Error";
  updatePreviewProgressBadge("Error");
}

function updatePreviewProgressBadge(label = "Loading") {
  if (!previewProgressBadge) return;
  const shouldShow = isRendering && processWasClosed;
  previewProgressBadge.hidden = !shouldShow;
  previewProgressBadge.textContent = `${label} ${Math.round(latestProcessPercent)}%`;
}

function hideProcessUi() {
  processPanel.hidden = true;
  processWasClosed = false;
  if (previewProgressBadge) previewProgressBadge.hidden = true;
}

function openFrameLightbox(index = currentPreviewIndex) {
  const frame = frames[index] || frames.find(Boolean);
  if (!frame || !imageLightbox || !lightboxImage) return;
  lightboxImage.src = frame.url;
  lightboxImage.alt = frame.name || `Frame ${index + 1}`;
  imageLightbox.hidden = false;
}

function closeLightbox() {
  if (!imageLightbox) return;
  imageLightbox.hidden = true;
}

function generateLocalStory() {
  const idea = buildGenerationDescription() || "a simple cinematic journey from mystery to a hopeful ending";
  const cleaned = idea.replace(/[.!?]+$/g, "");
  const intro = scriptLanguage.value === "malay"
    ? fitNarrationWords(`${cleaned} bermula dengan satu tanda pelik.`)
    : fitNarrationWords(`${cleaned} begins with one strange sign.`);
  const ending = scriptLanguage.value === "malay"
    ? "Akhirnya jawapan itu mengubah semuanya."
    : "At last, the answer changes everything.";
  subtitles = Array.from({ length: FRAME_COUNT }, (_, index) => {
    if (index === 0) return intro;
    if (index === FRAME_COUNT - 1) return ending;
    return fitNarrationWords(createDefaultSubtitle(index));
  });
}

function fitNarrationWords(text) {
  return cleanNarrationText(text);
}

function cleanNarrationText(text) {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/([.!?])\s+dengan(?:\s+penuh)?(?:\s+harapan)?(?:\s+baru)?\.?$/i, "$1")
    .replace(/\s+dengan penuh(?:\s+[^.!?]+)?\.?$/i, ".")
    .replace(/\s+dengan penuh harapan(?:\s+baru)?\.?$/i, ".")
    .replace(/\s+dengan\.?$/i, ".")
    .replace(/\s+with quiet hope(?:\s+again)?\.?$/i, ".")
    .replace(/\s+with hope(?:\s+again)?\.?$/i, ".")
    .replace(/\s+baru\.?$/i, ".")
    .replace(/\s+\./g, ".")
    .trim();
  const sentence = cleaned.endsWith(".") || cleaned.endsWith("!") || cleaned.endsWith("?") ? cleaned : `${cleaned}.`;
  return limitSubtitleCharacters(sentence);
}

function limitSubtitleCharacters(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_SUBTITLE_CHARS) return normalized;
  const words = normalized.replace(/[.!?]+$/g, "").split(" ");
  let line = "";
  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;
    if (`${next}.`.length <= MAX_SUBTITLE_CHARS) line = next;
  });
  return `${line || normalized.slice(0, MAX_SUBTITLE_CHARS - 1).trim()}.`;
}

async function regenerateFrameScript(index) {
  if (isRendering) return;
  const previousText = subtitles[index];
  setFrameActionBusy(index, "script", true);
  try {
    const response = await fetch("/api/regenerate-frame-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: videoTitle.value,
        description: buildGenerationDescription(),
        niche: getSelectedNichePreset().label,
        provider: getAiProvider(),
        language: scriptLanguage.value,
        index,
        frames: subtitles
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Frame script failed.");
    subtitles[index] = cleanNarrationText(result.line || previousText);
    clearFrameVoiceCache(index);
    hasGeneratedScript = true;
    renderScriptList();
    drawScene(index, 0.35);
    renderFrameSlots(index);
    renderUploadGuide(index);
    voiceStatus.textContent = `Frame ${index + 1} script regenerated.`;
  } catch (error) {
    subtitles[index] = previousText;
    alert(error.message);
  } finally {
    setFrameActionBusy(index, "script", false);
  }
}

async function regenerateFrameVoice(index) {
  if (isRendering) return;
  setFrameActionBusy(index, "voice", true);
  try {
    clearFrameVoiceCache(index);
    await getApiVoiceAudioUrl(index);
    voiceStatus.textContent = `Frame ${index + 1} voice regenerated.`;
  } catch (error) {
    alert(error.message);
  } finally {
    setFrameActionBusy(index, "voice", false);
  }
}

async function playFrameVoice(index) {
  if (isRendering) return;
  setFrameActionBusy(index, "play", true);
  try {
    const audioUrl = getVoiceProvider() === "browser" ? "" : await getApiVoiceAudioUrl(index);
    if (audioUrl) {
      let audio = document.querySelector("#singleFrameAudio");
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "singleFrameAudio";
        audio.hidden = true;
        document.body.append(audio);
      }
      audio.src = audioUrl;
      audio.currentTime = 0;
      await audio.play();
    } else if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(subtitles[index]);
      utterance.rate = voiceStyle.value === "calm" ? 0.86 : voiceStyle.value === "bright" ? 1.04 : 0.94;
      utterance.pitch = voiceStyle.value === "bright" ? 1.18 : voiceStyle.value === "calm" ? 0.9 : 1;
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    alert(error.message);
  } finally {
    setFrameActionBusy(index, "play", false);
  }
}

function clearFrameVoiceCache(index, shouldRender = true) {
  if (frameNarrationAudioUrls[index]) URL.revokeObjectURL(frameNarrationAudioUrls[index]);
  frameNarrationAudioUrls[index] = "";
  frameNarrationAudios[index] = null;
  frameDurations[index] = FRAME_SECONDS;
  if (shouldRender) {
    renderScriptList();
    syncUi();
  }
}

function setFrameActionBusy(index, action, busy) {
  const card = scriptList.querySelectorAll(".script-card")[index];
  const button = card?.querySelector(`[data-action="${action}"]`);
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? "..." : action === "script" ? "Script" : action === "voice" ? "Voice" : "Play voice";
}

async function generateAiImages() {
  if (isRendering) return;
  const selectedQuality = getImageQuality();
  const selectedProvider = getAiProvider() === "google" ? "Google" : "OpenAI";
  if (!confirm(`Generate ${FRAME_COUNT} ${selectedQuality}-quality ${selectedProvider} images from the current script? This will use your API credits.`)) return;

  isRendering = true;
  showProcess("Generating", hasGeneratedScript ? "Preparing current script..." : `Writing ${FRAME_COUNT}-frame script...`);
  generateImagesBtn.textContent = `Generating ${FRAME_COUNT} ${selectedQuality}-quality images...`;
  progressFill.style.width = "0";
  syncUi();

  try {
    clearNarrationCache();
    if (!hasGeneratedScript) {
      setProcess(0, `Writing ${FRAME_COUNT}-frame script...`, 5);
      await generateStory({ openPopup: false, force: true });
    }
    setProcess(1, `Script ready. Generating image 1 of ${FRAME_COUNT}...`, 18);

    const generatedFrames = [];
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      const stepIndex = index + 1;
      const referenceFrame = index > 0 ? generatedFrames[0] : null;
      const result = await generateImageWithRetry(index, stepIndex, referenceFrame);
      generatedFrames[index] = await apiImageToFrame(result.image, index);
      frames = [...generatedFrames, ...Array(FRAME_COUNT - generatedFrames.length).fill(null)].slice(0, FRAME_COUNT);
      renderFrameSlots(index);
      syncUi();
      drawScene(index, 0.35);
      progressFill.style.width = `${Math.round(((index + 1) / FRAME_COUNT) * 100)}%`;
    }

    if (isApiVoiceProvider()) {
      setProcess(5, "Generating spoken voice...", 94);
      await Promise.all(subtitles.map((_, index) => getApiVoiceAudioUrl(index)));
    }

    setProcess(5, "Ready. Download button is available.", 100);
    apiStatus.textContent = `Generated ${FRAME_COUNT} story images. Ready for video.`;
    voiceStatus.textContent = getVoiceProvider() === "browser" ? "Browser preview only." : "Spoken voice ready.";
    setTimeout(() => {
      hideProcessUi();
    }, 700);
  } catch (error) {
    failProcess(error.message);
    apiStatus.textContent = error.message;
    alert(error.message);
  } finally {
    isRendering = false;
    generateImagesBtn.textContent = `Generate ${FRAME_COUNT} Images`;
    updatePreviewProgressBadge();
    syncUi();
  }
}

async function generateImageWithRetry(index, stepIndex, referenceFrame) {
  let lastError = null;
  const referenceLabel = referenceFrame ? " using scene 1 identity reference" : " from story prompt";
  for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES; attempt += 1) {
    try {
      setProcess(
        stepIndex,
        `Generating image ${index + 1} of ${FRAME_COUNT}${referenceLabel}... attempt ${attempt}/${MAX_IMAGE_RETRIES}`,
        18 + (index / FRAME_COUNT) * 70 + (attempt - 1) * 2
      );
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: videoTitle.value,
          idea: buildGenerationDescription(),
          niche: getSelectedNichePreset().label,
          provider: getAiProvider(),
          subtitles,
          format: videoFormat.value,
          language: scriptLanguage.value,
          motion: motionStyle.value,
          frameCount: FRAME_COUNT,
          quality: getImageQuality(),
          size: getImageSize(),
          index,
          referenceImage: referenceFrame?.b64 || ""
        })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Image ${index + 1} failed.`);
      }
      if (!result.image?.b64 || !result.image?.mime) {
        throw new Error(`Image ${index + 1} returned empty data.`);
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_IMAGE_RETRIES) {
        setProcess(
          stepIndex,
          `Image ${index + 1} failed. Retrying ${attempt + 1}/${MAX_IMAGE_RETRIES}${referenceFrame ? " with reference" : ""}...`,
          18 + (index / FRAME_COUNT) * 70 + attempt * 2
        );
        await wait(1200 * attempt);
      }
    }
  }
  throw new Error(`Image ${index + 1} failed after ${MAX_IMAGE_RETRIES} tries. ${lastError?.message || ""}`);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getImageSize() {
  return videoFormat.value === "portrait" ? "1024x1536" : "1536x1024";
}

function getImageQuality() {
  return imageQuality?.value || "medium";
}

function apiImageToFrame(item, index) {
  if (!item?.b64 || !item?.mime) {
    return Promise.reject(new Error(`Image ${index + 1} returned empty data.`));
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = `data:${item.mime || "image/png"};base64,${item.b64}`;
    image.onload = () => resolve({
      image,
      url,
      name: item.name || `AI frame ${index + 1}`,
      prompt: item.prompt,
      b64: item.b64,
      usedReference: item.usedReference || false
    });
    image.onerror = reject;
    image.src = url;
  });
}

async function handleManualUpload(event) {
  const selectedFiles = Array.from(event.target.files || []);
  if (!selectedFiles.length) return;
  const emptyIndexes = frames
    .map((frame, index) => frame ? -1 : index)
    .filter(index => index >= 0);
  if (!emptyIndexes.length) {
    manualUploadStatus.textContent = "All image slots are already ready.";
    event.target.value = "";
    return;
  }
  const filesToLoad = selectedFiles.slice(0, emptyIndexes.length);
  const ignoredCount = selectedFiles.length - filesToLoad.length;

  isRendering = true;
  manualUploadStatus.textContent = `Loading ${filesToLoad.length} image${filesToLoad.length === 1 ? "" : "s"}...`;
  showProcess("Manual Upload", "Reading images...", 8);
  setProcess(0, "Loading", 8);

  try {
    let firstAddedIndex = emptyIndexes[0];
    for (let index = 0; index < filesToLoad.length; index += 1) {
      const targetIndex = emptyIndexes[index];
      frames[targetIndex] = await fileToFrame(filesToLoad[index], targetIndex);
      setProcess(0, "Loading", 12 + Math.round(((index + 1) / filesToLoad.length) * 78));
    }

    stopPreview();
    clearDownloadReady();
    progressFill.style.width = "0";
    const ready = frames.filter(Boolean).length;
    manualUploadStatus.textContent = ready === FRAME_COUNT
      ? `${FRAME_COUNT} images ready. Click Next: Preview.`
      : `${ready}/${FRAME_COUNT} images ready. Next upload will fill Image ${ready + 1}.${ignoredCount > 0 ? ` ${ignoredCount} extra ignored.` : ""}`;
    renderFrameSlots(firstAddedIndex);
    renderUploadGuide(firstAddedIndex);
    syncUi();
    drawScene(firstAddedIndex, 0.35);
    setProcess(4, "Loading", 100);
    setTimeout(() => hideProcessUi(), 500);
  } catch (error) {
    manualUploadStatus.textContent = "Upload failed. Try another image.";
    failProcess(error.message || "Could not load uploaded images.");
    alert(error.message || "Could not load uploaded images.");
  } finally {
    isRendering = false;
    event.target.value = "";
    syncUi();
  }
}

function fileToFrame(file, index) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error(`File ${index + 1} is not an image.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({
        image,
        url: String(reader.result),
        name: file.name || `Manual frame ${index + 1}`,
        prompt: `Manual upload frame ${index + 1}`
      });
      image.onerror = () => reject(new Error(`Image ${index + 1} could not be opened.`));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error(`Image ${index + 1} could not be read.`));
    reader.readAsDataURL(file);
  });
}

function clearDownloadReady() {
  if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
  renderedVideoUrl = "";
  downloadLink.classList.remove("ready");
  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");
  downloadLink.textContent = "Download ready";
  if (downloadStatus) {
    downloadStatus.hidden = true;
    downloadStatus.textContent = "";
  }
}

async function previewVideo() {
  if (!hasAnyFrame() || isRendering) return;
  stopPreview();
  if (isApiVoiceProvider()) {
    await Promise.all(subtitles.map((_, index) => getApiVoiceAudioUrl(index)));
  }
  playNarrationPreview();
  const start = performance.now();
  previewTimer = requestAnimationFrame(function tick(now) {
    const elapsed = (now - start) / 1000;
    const total = getTotalDuration();
    const { frameIndex, sceneProgress } = getFrameTiming(elapsed);
    drawScene(frameIndex, sceneProgress);
    renderFrameSlots(frameIndex);
    progressFill.style.width = `${Math.min(100, elapsed / total * 100)}%`;
    if (elapsed < total) {
      previewTimer = requestAnimationFrame(tick);
    } else {
      stopPreview(false);
    }
  });
}

function stopPreview(cancelSpeech = true) {
  if (previewTimer) cancelAnimationFrame(previewTimer);
  previewTimer = null;
  if (cancelSpeech && "speechSynthesis" in window) speechSynthesis.cancel();
  const audio = document.querySelector("#elevenPreviewAudio");
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

async function playNarrationPreview() {
  if (isApiVoiceProvider()) {
    try {
      const audioUrls = [];
      for (let index = 0; index < FRAME_COUNT; index += 1) {
        audioUrls.push(await getApiVoiceAudioUrl(index));
      }
      let audio = document.querySelector("#elevenPreviewAudio");
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "elevenPreviewAudio";
        audio.hidden = true;
        document.body.append(audio);
      }
      let index = 0;
      const playNext = async () => {
        if (index >= audioUrls.length) return;
        audio.src = audioUrls[index];
        audio.currentTime = 0;
        index += 1;
        await audio.play();
      };
      audio.onended = playNext;
      await playNext();
      return;
    } catch (error) {
      voiceStatus.textContent = `${error.message} Browser voice used.`;
    }
  }
  speakAll();
}

function speakAll() {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  subtitles.forEach(text => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceStyle.value === "calm" ? 0.86 : voiceStyle.value === "bright" ? 1.04 : 0.94;
    utterance.pitch = voiceStyle.value === "bright" ? 1.18 : voiceStyle.value === "calm" ? 0.9 : 1;
    speechSynthesis.speak(utterance);
  });
}

async function exportVideo() {
  if (renderedVideoUrl) {
    return;
  }
  if (frames.filter(Boolean).length !== FRAME_COUNT || isRendering) return;
  if (!spendCredits(VIDEO_CREDIT_COST, "video generation")) return;
  let videoCreditCharged = true;
  stopPreview();
  isRendering = true;
  downloadLink.classList.remove("ready");
  downloadLink.removeAttribute("href");
  downloadLink.hidden = true;
  syncUi();
  showProcess("Rendering MP4", "Preparing video renderer...");
  setProcess(0, "Preparing canvas and audio tracks...", 5);
  exportBtn.textContent = "Rendering MP4...";

  let audioContext = null;
  try {
    audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    setProcess(1, "Scheduling voice for each 5-second image...", 18);
    await scheduleSelectedNarration(audioContext, destination);

    const canvasStream = canvas.captureStream(FPS);
    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks()
    ]);
    const recorderType = getRecorderMimeType();
    if (!window.MediaRecorder) throw new Error("This browser cannot render video with MediaRecorder.");
    const recorder = new MediaRecorder(stream, recorderType ? { mimeType: recorderType } : undefined);
    const chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };

    const finished = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(new Error("Video recorder failed."));
    });

    setProcess(2, "Rendering 20 seconds of motion frames...", 28);
    recorder.start();
    await renderTimeline((percent) => {
      setProcess(2, `Rendering frames... ${percent}%`, 28 + percent * 0.55);
    });
    setProcess(3, "Encoding video file...", 88);
    recorder.stop();
    await finished;

    const outputMime = recorder.mimeType || recorderType || "video/webm";
    const isMp4 = outputMime.includes("mp4");
    const blob = new Blob(chunks, { type: outputMime });
    if (!blob.size) throw new Error("Video render returned an empty file.");
    const url = URL.createObjectURL(blob);
    renderedVideoUrl = url;
    downloadLink.href = url;
    downloadLink.classList.add("ready");
    downloadLink.hidden = false;
    downloadLink.textContent = isMp4 ? "Download MP4" : "Download video";
    downloadLink.download = `${slugify(videoTitle.value || "storyframe-video")}.${isMp4 ? "mp4" : "webm"}`;
    if (downloadStatus) {
      downloadStatus.hidden = false;
      downloadStatus.textContent = isMp4
        ? "Video ready. Click Download MP4 to save."
        : "Video ready. Click Download video to save.";
    }
    setProcess(4, isMp4 ? "MP4 ready. Click Download MP4 when you want to save it." : "Video ready. Click Download video when you want to save it.", 100);
    setGuideStep(5);
    setTimeout(() => {
      hideProcessUi();
    }, 900);
  } catch (error) {
    if (videoCreditCharged) {
      adminCredits += VIDEO_CREDIT_COST;
      videoCreditCharged = false;
      saveCredits();
    }
    failProcess(error.message);
    alert(error.message);
  } finally {
    if (audioContext) await audioContext.close().catch(() => {});
    isRendering = false;
    updatePreviewProgressBadge();
    syncUi();
  }
}

function getRecorderMimeType() {
  return [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ].find(type => MediaRecorder.isTypeSupported(type)) || "";
}

async function scheduleSelectedNarration(audioContext, destination) {
  if (isApiVoiceProvider()) {
    try {
      const sources = [];
      for (let index = 0; index < FRAME_COUNT; index += 1) {
        const audioUrl = await getApiVoiceAudioUrl(index);
        const audioData = await fetch(audioUrl).then(response => response.arrayBuffer());
        const buffer = await audioContext.decodeAudioData(audioData);
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        source.buffer = buffer;
        gain.gain.value = 0.95;
        source.connect(gain);
        gain.connect(destination);
        source.start(audioContext.currentTime + getFrameStart(index) + 0.04);
        sources.push(source);
      }
      return sources;
    } catch (error) {
      voiceStatus.textContent = `${error.message} Browser voice tone used.`;
    }
  }
  scheduleNarration(audioContext, destination);
  return null;
}

async function getApiVoiceAudioUrl(frameIndex = 0) {
  if (frameNarrationAudioUrls[frameIndex]) return frameNarrationAudioUrls[frameIndex];
  const provider = getVoiceProvider();
  const providerLabel = provider === "google" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "ElevenLabs";
  const endpoint = provider === "google" ? "/api/generate-gemini-voice" : provider === "openai" ? "/api/generate-openai-voice" : "/api/generate-voice";
  voiceStatus.textContent = `Generating ${providerLabel} voice ${frameIndex + 1}/${FRAME_COUNT}...`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: subtitles[frameIndex] || "",
      style: voiceStyle.value,
      language: scriptLanguage.value,
      voiceName: geminiVoice?.value || "Zephyr"
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `${providerLabel} voice ${frameIndex + 1} failed.`);
  }
  const bytes = base64ToBytes(result.b64);
  frameNarrationAudios[frameIndex] = new Blob([bytes], { type: result.mime || "audio/mpeg" });
  frameNarrationAudioUrls[frameIndex] = URL.createObjectURL(frameNarrationAudios[frameIndex]);
  frameDurations[frameIndex] = await getAudioDuration(frameNarrationAudioUrls[frameIndex]);
  renderScriptList();
  syncUi();
  voiceStatus.textContent = `${providerLabel} frame voices generated.`;
  return frameNarrationAudioUrls[frameIndex];
}

function getAudioDuration(url) {
  return new Promise(resolve => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(Math.max(1.2, audio.duration + 0.12));
    audio.onerror = () => resolve(FRAME_SECONDS);
    audio.src = url;
  });
}

function buildNarrationText() {
  return subtitles.map((subtitle, index) => `Scene ${index + 1}. ${subtitle}`).join(" ");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function scheduleNarration(audioContext, destination) {
  const base = voiceStyle.value === "bright" ? 270 : voiceStyle.value === "calm" ? 165 : 210;
  const gain = audioContext.createGain();
  gain.gain.value = 0.18;
  gain.connect(destination);

  subtitles.forEach((subtitle, frameIndex) => {
    const words = subtitle.split(/\s+/).filter(Boolean).slice(0, 18);
    const duration = frameDurations[frameIndex] || FRAME_SECONDS;
    const wordDuration = Math.min(0.24, (duration - 0.7) / Math.max(words.length, 1));
    words.forEach((word, wordIndex) => {
      const start = audioContext.currentTime + getFrameStart(frameIndex) + 0.35 + wordIndex * wordDuration;
      const oscillator = audioContext.createOscillator();
      const wordGain = audioContext.createGain();
      const variance = Array.from(word).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 90;
      oscillator.type = voiceStyle.value === "bright" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(base + variance, start);
      oscillator.frequency.exponentialRampToValueAtTime(base + variance + 18, start + wordDuration * 0.8);
      wordGain.gain.setValueAtTime(0.001, start);
      wordGain.gain.exponentialRampToValueAtTime(0.78, start + 0.018);
      wordGain.gain.exponentialRampToValueAtTime(0.001, start + wordDuration);
      oscillator.connect(wordGain);
      wordGain.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + wordDuration + 0.02);
    });
  });
}

function renderTimeline(onProgress) {
  return new Promise(resolve => {
    const total = getTotalDuration();
    const totalFrames = Math.ceil(total * FPS);
    let tick = 0;
    const interval = setInterval(() => {
      const elapsed = tick / FPS;
      const { frameIndex, sceneProgress } = getFrameTiming(elapsed);
      drawScene(frameIndex, sceneProgress);
      renderFrameSlots(frameIndex);
      const percent = Math.min(100, tick / totalFrames * 100);
      progressFill.style.width = `${percent}%`;
      if (onProgress && tick % 6 === 0) onProgress(Math.round(percent));
      tick += 1;
      if (tick > totalFrames) {
        clearInterval(interval);
        progressFill.style.width = "100%";
        if (onProgress) onProgress(100);
        resolve();
      }
    }, 1000 / FPS);
  });
}

function loadDemoFrames() {
  frames = Array.from({ length: FRAME_COUNT }, (_, index) => {
    const demoCanvas = document.createElement("canvas");
    demoCanvas.width = WIDTH;
    demoCanvas.height = HEIGHT;
    const demo = demoCanvas.getContext("2d");
    const hue = [184, 11, 43, 206, 148, 28, 331, 92][index];
    const gradient = demo.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, `hsl(${hue}, 62%, 38%)`);
    gradient.addColorStop(1, `hsl(${(hue + 78) % 360}, 72%, 60%)`);
    demo.fillStyle = gradient;
    demo.fillRect(0, 0, WIDTH, HEIGHT);
    demo.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 7; i += 1) {
      demo.beginPath();
      demo.arc(170 + i * 180, 120 + ((i + index) % 5) * 105, 90 + (i % 3) * 34, 0, Math.PI * 2);
      demo.fill();
    }
    demo.fillStyle = "rgba(255,255,255,0.9)";
    demo.font = "800 78px Inter, sans-serif";
    demo.textAlign = "center";
    demo.fillText(`Frame ${index + 1}`, WIDTH / 2, HEIGHT / 2);
    return {
      image: demoCanvas,
      url: demoCanvas.toDataURL("image/png"),
      name: `Demo frame ${index + 1}`
    };
  });
  generateLocalStory();
  renderScriptList();
  renderFrameSlots();
  syncUi();
  setTimeout(() => drawScene(0, 0), 50);
}

function clearAll() {
  stopPreview();
  frames = Array(FRAME_COUNT).fill(null);
  clearNarrationCache();
  clearDownloadReady();
  progressFill.style.width = "0";
  renderFrameSlots();
  syncUi();
  drawPlaceholder();
}

function markDownloadStarted() {
  if (!renderedVideoUrl) return;
  const readyText = downloadLink.textContent || "Download MP4";
  downloadLink.textContent = "Saving...";
  if (downloadStatus) {
    downloadStatus.hidden = false;
    downloadStatus.textContent = "Download started.";
  }
  setTimeout(() => {
    downloadLink.textContent = "Downloaded";
  }, 450);
  setTimeout(() => {
    downloadLink.textContent = readyText;
    if (downloadStatus) downloadStatus.textContent = "Video ready. Click again to download another copy.";
  }, 1800);
}

function getCurrentFrameFromProgress() {
  const width = parseFloat(progressFill.style.width || "0");
  return Math.min(FRAME_COUNT - 1, Math.floor((width / 100) * FRAME_COUNT));
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "storyframe-video";
}

init();
