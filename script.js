document.addEventListener("DOMContentLoaded", function() {
  // --- PHẦN KHỞI TẠO ---
  const hskLevelListEl = document.getElementById('hskLevelList');
  const lessonListEl = document.getElementById('lessonList');
  const sampleCharacterEl = document.getElementById('sampleCharacter');
  const samplePinyinEl = document.getElementById('samplePinyin');
  const sampleTranslationEl = document.getElementById('sampleTranslation');
  const guideToggle = document.getElementById('guideToggle');

  const guideCanvas = document.getElementById('guideCanvas');
  const guideCtx = guideCanvas.getContext('2d');
  const drawCanvas = document.getElementById('drawCanvas');
  const ctx = drawCanvas.getContext('2d');

  const historyBtn = document.getElementById('historyBtn');
  const historyModal = document.getElementById('historyModal');
  const closeHistory = document.getElementById('closeHistory');
  const historyList = document.getElementById('historyList');

  // --- HÀM DỊCH (nếu cần) ---
  function translateText(text, targetLang) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    return fetch(url)
      .then(response => response.json())
      .then(data => {
         if (data && data.responseData && data.responseData.translatedText) {
             return data.responseData.translatedText;
         }
         return text;
      })
      .catch(error => {
         console.error("Translation error:", error);
         return text;
      });
  }
  
  function translateArray(arr, targetLang) {
    return Promise.all(arr.map(item => translateText(item, targetLang)));
  }

  // --- HÀM LOAD BÀI HỌC ---
  function loadLevel(level) {
    fetch(`data/${level}.json`)
      .then(response => {
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         return response.json();
      })
      .then(data => {
         lessonListEl.innerHTML = '';
         data.forEach(lesson => {
            const li = document.createElement('li');
            li.classList.add('lesson-item');
            li.textContent = lesson.hanzi;
            li.addEventListener('click', () => {
               document.querySelectorAll('.lesson-item').forEach(item => item.classList.remove('active'));
               li.classList.add('active');
               sampleCharacterEl.textContent = lesson.hanzi;
               samplePinyinEl.textContent = "Phiên âm: " + lesson.pinyin;
               sampleTranslationEl.textContent = "Đang dịch...";
               translateArray(lesson.translations, "vi").then(translatedArray => {
                 sampleTranslationEl.textContent = "Dịch: " + translatedArray.join(", ");
               });
               // Vẽ lại hướng dẫn nếu toggle đang bật
               drawGuide();
               // Xóa canvas vẽ (drawCanvas)
               ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            });
            lessonListEl.appendChild(li);
         });
      })
      .catch(error => {
         console.error('Error loading JSON file:', error);
         lessonListEl.innerHTML = '<li>Error loading lessons</li>';
      });
  }
  
  document.querySelectorAll('.level-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.level-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      const level = item.getAttribute('data-level');
      loadLevel(level);
    });
  });
  
  // --- VẼ HƯỚNG DẪN HÀNZI ---
  // Hàm vẽ hướng dẫn (nét mờ) trên guideCanvas
  function drawGuide() {
    // Nếu checkbox không bật, xóa guideCanvas và thoát
    if (!guideToggle.checked) {
      guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
      return;
    }
    const text = sampleCharacterEl.textContent;
    if (!text) return;
    // Xóa canvas trước khi vẽ
    guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    // Cài đặt font chữ, căn giữa
    guideCtx.font = "150px sans-serif"; // Điều chỉnh kích thước nếu cần
    guideCtx.textAlign = "center";
    guideCtx.textBaseline = "middle";
    guideCtx.fillStyle = "#000"; // Màu chữ hướng dẫn
    guideCtx.fillText(text, guideCanvas.width / 2, guideCanvas.height / 2);
  }

  // Gọi hàm vẽ hướng dẫn ban đầu
  drawGuide();

  // Khi trạng thái của checkbox thay đổi, vẽ lại hướng dẫn
  guideToggle.addEventListener("change", drawGuide);

  // --- PHÁT ÂM (Sử dụng Web Speech API) ---
  pronounceBtn.addEventListener("click", function() {
    const text = sampleCharacterEl.textContent;
    if (!text) {
      alert("Chưa có từ để phát âm!");
      return;
    }
    // Tạo đối tượng SpeechSynthesisUtterance
    const utterance = new SpeechSynthesisUtterance(text);
    // Đặt ngôn ngữ cho tiếng Trung (zh-CN)
    utterance.lang = "zh-CN";
    // Phát âm
    speechSynthesis.speak(utterance);
  });
  // Xử lý vẽ trên canvas người dùng (drawCanvas)
  let drawing = false;
  drawCanvas.addEventListener("mousedown", (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });
  drawCanvas.addEventListener("mousemove", (e) => {
    if (drawing) {
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  });
  drawCanvas.addEventListener("mouseup", () => drawing = false);
  drawCanvas.addEventListener("mouseleave", () => drawing = false);
  
 // --- CHỨC NĂNG CHẤM ĐIỂM VÀ LƯU LỊCH SỬ ---
// Hàm gọi Cloud Function để lấy đánh giá từ OpenAI
async function getOpenAIScore(character, rawScore) {
  try {
    const response = await fetch("https://us-central1-your-project.cloudfunctions.net/getOpenAIScore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ character, rawScore })
    });
    const data = await response.json();
    if (data.result) {
      return data.result;
    } else {
      return "Không nhận được đánh giá từ OpenAI.";
    }
  } catch (error) {
    console.error("Lỗi khi gọi Cloud Function:", error);
    return "Có lỗi xảy ra khi chấm điểm.";
  }
}

// Hàm lưu lịch sử làm bài vào Firebase Realtime Database
function saveHistoryRecord(character, rawScore, evaluation) {
  firebase.database().ref('history').push({
    character: character,
    rawScore: rawScore,
    evaluation: evaluation,
    timestamp: Date.now()
  }).then(() => {
    console.log("Lịch sử được lưu thành công.");
  }).catch((error) => {
    console.error("Lỗi lưu lịch sử:", error);
  });
}

// Hàm chấm điểm dựa trên so sánh pixel (tính điểm sơ bộ) sau đó gọi AI tinh chỉnh và lưu lịch sử
async function checkStroke() {
  const sampleText = sampleCharacterEl.textContent;
  if (!sampleText || sampleText === "Chọn bài học") {
    alert("Vui lòng chọn bài học trước.");
    return;
  }
  
  // Tạo canvas ẩn để render mẫu chữ
  const offscreen = document.createElement('canvas');
  offscreen.width = drawCanvas.width;
  offscreen.height = drawCanvas.height;
  const offCtx = offscreen.getContext('2d');
  
  // Vẽ mẫu chữ vào offscreen canvas
  offCtx.fillStyle = "#fff";
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
  offCtx.font = "150px sans-serif"; // điều chỉnh font size cho phù hợp
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";
  offCtx.fillStyle = "#000";
  offCtx.fillText(sampleText, offscreen.width / 2, offscreen.height / 2);
  
  // Lấy dữ liệu pixel từ offscreen (mẫu chữ) và canvas người dùng (drawCanvas)
  const sampleData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const userData = ctx.getImageData(0, 0, drawCanvas.width, drawCanvas.height).data;
  
  // Chuyển đổi pixel thành nhị phân: 1 nếu có mực, 0 nếu trắng
  const threshold = 128;
  let sampleInk = 0, userInk = 0, overlapInk = 0;
  const totalPixels = sampleData.length / 4;
  
  for (let i = 0; i < totalPixels; i++) {
    const rSample = sampleData[i * 4],
          gSample = sampleData[i * 4 + 1],
          bSample = sampleData[i * 4 + 2];
    const graySample = (rSample + gSample + bSample) / 3;
    const samplePixel = graySample < threshold ? 1 : 0;
    
    const rUser = userData[i * 4],
          gUser = userData[i * 4 + 1],
          bUser = userData[i * 4 + 2];
    const grayUser = (rUser + gUser + bUser) / 3;
    const userPixel = grayUser < threshold ? 1 : 0;
    
    sampleInk += samplePixel;
    userInk += userPixel;
    if (samplePixel === 1 && userPixel === 1) {
      overlapInk++;
    }
  }
  
  let rawScore = 0;
  if (sampleInk + userInk > 0) {
    rawScore = (2 * overlapInk) / (sampleInk + userInk) * 100;
  }
  rawScore = Math.round(rawScore);
  
  alert("Điểm sơ bộ: " + rawScore + " / 100. Đang chấm điểm qua OpenAI...");
  
  // Gọi Cloud Function để tinh chỉnh điểm và nhận phản hồi từ OpenAI
  const openAIResponse = await getOpenAIScore(sampleText, rawScore);
  alert("Đánh giá từ OpenAI:\n" + openAIResponse);
  
  // Lưu lịch sử làm bài
  saveHistoryRecord(sampleText, rawScore, openAIResponse);
}

// Hàm load lịch sử từ Firebase và hiển thị vào modal
function loadHistoryRecords() {
  firebase.database().ref('history').orderByChild('timestamp').once('value', snapshot => {
    historyList.innerHTML = "";
    snapshot.forEach(childSnapshot => {
      const record = childSnapshot.val();
      const date = new Date(record.timestamp);
      const li = document.createElement('li');
      li.textContent = `${record.character} - ${record.rawScore}/100 - ${record.evaluation} (${date.toLocaleString()})`;
      historyList.appendChild(li);
    });
  });
}

// Sự kiện cho nút "Lịch sử"
historyBtn.addEventListener('click', () => {
  loadHistoryRecords();
  historyModal.style.display = "block";
});
closeHistory.addEventListener('click', () => {
  historyModal.style.display = "none";
});
window.addEventListener('click', (event) => {
  if (event.target == historyModal) {
    historyModal.style.display = "none";
  }
});

  // --- Các nút chức năng khác ---
  document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  });
  document.getElementById('checkBtn').addEventListener('click', checkStroke);
  document.getElementById('saveBtn').addEventListener('click', () => {
    const dataURL = drawCanvas.toDataURL();
    alert("Bài luyện viết đã được lưu (chức năng demo).");
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  });
});
