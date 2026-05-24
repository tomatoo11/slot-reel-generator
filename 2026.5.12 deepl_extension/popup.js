const apiKeyInput = document.querySelector("#apiKey");
const saveKeyButton = document.querySelector("#saveKey");
const keyStatus = document.querySelector("#keyStatus");
const sourceText = document.querySelector("#sourceText");
const resultText = document.querySelector("#resultText");
const translateButton = document.querySelector("#translate");
const message = document.querySelector("#message");
const modeButtons = [...document.querySelectorAll(".mode")];

const STORAGE_KEY = "deeplApiKey";

let selectedSourceLang = "JA";
let selectedTargetLang = "EN-US";

function loadSavedApiKey() {
  const savedKey = localStorage.getItem(STORAGE_KEY);

  if (!savedKey) {
    keyStatus.textContent = "APIキーはまだ保存されていません。";
    return;
  }

  apiKeyInput.value = savedKey;
  keyStatus.textContent = "保存済みのAPIキーを読み込みました。";
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function getDeepLEndpoint(apiKey) {
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    keyStatus.textContent = "APIキーを入力してください。";
    setMessage("APIキーが空です。", "error");
    return;
  }

  localStorage.setItem(STORAGE_KEY, apiKey);
  keyStatus.textContent = "APIキーをLocalStorageに保存しました。";
  setMessage("APIキーを保存しました。", "success");
}

function selectMode(button) {
  modeButtons.forEach((modeButton) => {
    modeButton.classList.toggle("active", modeButton === button);
  });

  selectedSourceLang = button.dataset.source;
  selectedTargetLang = button.dataset.target;
}

async function translateText() {
  const apiKey = apiKeyInput.value.trim();
  const text = sourceText.value.trim();

  if (!apiKey) {
    setMessage("先にDeepL APIキーを入力してください。", "error");
    return;
  }

  if (!text) {
    setMessage("翻訳したい文章を入力してください。", "error");
    return;
  }

  localStorage.setItem(STORAGE_KEY, apiKey);
  translateButton.disabled = true;
  translateButton.textContent = "翻訳中...";
  setMessage("DeepL APIに翻訳を依頼しています。");

  try {
    const body = new URLSearchParams({
      text,
      source_lang: selectedSourceLang,
      target_lang: selectedTargetLang
    });

    const response = await fetch(getDeepLEndpoint(apiKey), {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = data?.message ? ` 詳細: ${data.message}` : "";
      throw new Error(`翻訳に失敗しました。HTTP ${response.status}.${detail}`);
    }

    const translatedText = data?.translations?.[0]?.text;

    if (!translatedText) {
      throw new Error("翻訳結果を取得できませんでした。");
    }

    resultText.value = translatedText;
    setMessage("翻訳が完了しました。", "success");
  } catch (error) {
    resultText.value = "";
    setMessage(error.message, "error");
  } finally {
    translateButton.disabled = false;
    translateButton.textContent = "翻訳する";
  }
}

saveKeyButton.addEventListener("click", saveApiKey);
translateButton.addEventListener("click", translateText);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => selectMode(button));
});

loadSavedApiKey();
