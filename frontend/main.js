const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const preview = document.getElementById("preview");
const locationInput = document.getElementById("location");
const locationStatus = document.getElementById("locationStatus");
const generateBtn = document.getElementById("generateBtn");
const resultArea = document.getElementById("resultArea");
const resultText = document.getElementById("resultText");
const errorArea = document.getElementById("errorArea");
const errorText = document.getElementById("errorText");
const copyBtn = document.getElementById("copyBtn");
const retryBtn = document.getElementById("retryBtn");

let currentImageBase64 = null;
let selectedTone = "감성적";

// 사진 업로드
uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "#222";
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "";
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleFile(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  // 미리보기
  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.hidden = false;
  uploadPlaceholder.hidden = true;
  uploadArea.classList.add("has-image");

  // base64 변환
  currentImageBase64 = await toBase64(file);
  generateBtn.disabled = false;

  // EXIF GPS 추출
  locationInput.placeholder = "위치 정보를 불러오는 중...";
  locationStatus.textContent = "⏳";
  try {
    const exif = await exifr.parse(file, { gps: true });
    if (exif && exif.latitude && exif.longitude) {
      const placeName = await reverseGeocode(exif.latitude, exif.longitude);
      locationInput.value = placeName;
      locationInput.placeholder = "위치를 입력하세요";
      locationStatus.textContent = "📍 자동 완성";
    } else {
      locationInput.placeholder = "위치를 직접 입력하세요";
      locationStatus.textContent = "GPS 없음";
    }
  } catch {
    locationInput.placeholder = "위치를 직접 입력하세요";
    locationStatus.textContent = "";
  }
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`;
  const res = await fetch(url, {
    headers: { "User-Agent": "snaplog-app" },
  });
  const data = await res.json();
  const addr = data.address;
  // 도시/지역 정보만 간결하게
  return (
    addr.city || addr.town || addr.village || addr.county || addr.state || data.display_name
  );
}

function toBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:image/...;base64, 앞부분 제거
      resolve(reader.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  });
}

// 톤 선택
document.querySelectorAll(".tone-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tone-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTone = btn.dataset.tone;
  });
});

// 후기 생성
generateBtn.addEventListener("click", generateReview);
retryBtn.addEventListener("click", generateReview);

async function generateReview() {
  if (!currentImageBase64) return;

  generateBtn.disabled = true;
  generateBtn.textContent = "생성 중...";
  generateBtn.classList.add("loading");
  resultArea.hidden = true;
  errorArea.hidden = true;

  try {
    const res = await fetch("http://localhost:5000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: currentImageBase64,
        location: locationInput.value.trim(),
        tone: selectedTone,
      }),
    });

    const data = await res.json();

    if (data.error) {
      showError(data.error);
    } else {
      resultText.textContent = data.review;
      resultArea.hidden = false;
    }
  } catch {
    showError("서버에 연결할 수 없어요. Flask 서버가 실행 중인지 확인해주세요.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "후기 생성하기";
    generateBtn.classList.remove("loading");
  }
}

function showError(msg) {
  errorText.textContent = msg;
  errorArea.hidden = false;
}

// 복사
copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(resultText.textContent);
  copyBtn.textContent = "복사됨!";
  setTimeout(() => (copyBtn.textContent = "복사"), 1500);
});
