const TASKS = [
  { id: 1, title: "TASK 1: BE A FROZEN POTATO 🥔", desc: "Do not move a single hair! Pretend you're a potato in a pantry.", duration: 8 },
  { id: 2, title: "TASK 2: STARE CONTEST WITH DUST 👁️", desc: "Blinking is forbidden! Keep those peepers wide open!", duration: 8 },
  { id: 3, title: "TASK 3: BALANCE AN IMAGINARY EGG 🥚", desc: "Keep your head perfectly straight or the egg falls!", duration: 8 },
  { id: 4, title: "TASK 4: CREEPY SILLY SMILE 😁", desc: "Show us your best super unnatural smile!", duration: 8 },
  { id: 5, title: "TASK 5: MOUTH FLAP ISOLATION 😮", desc: "Drop your jaw slightly, but keep your eyes totally frozen!", duration: 8 },
  { id: 6, title: "TASK 6: THE ULTIMATE HUMAN STATUE 🗿", desc: "Final Boss: Zero twitching, zero blinking, absolute zero!", duration: 10 }
];

const INSTANT_FAIL_MEMES = [
  "Enthinaada Shobha ithu? 🤦‍♂️",
  "Blink-iyennu paranjaal blink-i! 👁️",
  "Nokkedaa... Out aan! 🚫",
  "Po Mone Dinesha! Out aayi! 💥",
  "Ithu ennnathinte keda? 🐛",
  "Savadhana Devadoothan... Shaking aanu! 🫨",
  "Ithokke Ethu Naattile Sambradhayam? 🤷‍♂️",
  "Sheriyenna... Ithine kondu poyko! 🚶‍♂️",
  "Njan paranjatha... Poyi, poyi! 💸",
  "Kandu kandu... Clearly kandu! 📸"
];

const BURST_EMOJIS = ["💥", "⚡", "🤪", "👀", "⚠️", "🌀", "🚨"];

let currentTaskIdx = 0;
let timeRemaining = 0;
let timerInterval = null;
let lastLandmarks = null;
let blooperSnapshots = [];
let lastBlooperTime = 0;
let lastMemeTime = 0;

let metrics = {
  totalJitter: 0,
  blinks: 0,
  isEyeClosed: false,
  maxTilt: 0,
  mouthTremor: 0,
  samples: 0
};

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Sound Effects
function playBubblePop() {
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch(e){}
}

function playTaskChime() {
  try {
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.1, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.3);
    });
  } catch(e){}
}

function playSoftWarning() {
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch(e){}
}

// Malayalam Instant Fail Pop-up
function showInstantFailMeme(xRatio = 0.5, yRatio = 0.5) {
  const now = Date.now();
  if (now - lastMemeTime < 1200) return; // Prevent text overlap spam
  lastMemeTime = now;

  const memeEl = document.createElement('div');
  memeEl.innerText = INSTANT_FAIL_MEMES[Math.floor(Math.random() * INSTANT_FAIL_MEMES.length)];
  
  const posX = Math.min(Math.max(xRatio * window.innerWidth, 50), window.innerWidth - 200);
  const posY = Math.min(Math.max(yRatio * window.innerHeight, 50), window.innerHeight - 100);

  memeEl.style.position = 'fixed';
  memeEl.style.left = `${posX}px`;
  memeEl.style.top = `${posY}px`;
  memeEl.style.background = '#ff0055';
  memeEl.style.color = '#ffffff';
  memeEl.style.padding = '8px 14px';
  memeEl.style.borderRadius = '20px';
  memeEl.style.fontWeight = 'bold';
  memeEl.style.fontSize = '16px';
  memeEl.style.boxShadow = '0 0 15px rgba(255, 0, 85, 0.8)';
  memeEl.style.zIndex = '9999';
  memeEl.style.pointerEvents = 'none';
  memeEl.style.transition = 'all 0.3s ease';

  document.body.appendChild(memeEl);

  setTimeout(() => {
    memeEl.style.opacity = '0';
    memeEl.style.transform = 'translateY(-20px)';
    setTimeout(() => memeEl.remove(), 300);
  }, 1000);
}

// Floating Emoji Burst
function triggerEmojiBurst(xRatio = 0.5, yRatio = 0.5) {
  for (let i = 0; i < 4; i++) {
    const emojiEl = document.createElement('div');
    emojiEl.innerText = BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)];
    emojiEl.style.position = 'fixed';
    emojiEl.style.fontSize = '24px';
    emojiEl.style.zIndex = '9998';
    emojiEl.style.pointerEvents = 'none';
    
    const posX = xRatio * window.innerWidth + (Math.random() * 80 - 40);
    const posY = yRatio * window.innerHeight + (Math.random() * 80 - 40);

    emojiEl.style.left = `${posX}px`;
    emojiEl.style.top = `${posY}px`;

    document.body.appendChild(emojiEl);

    setTimeout(() => {
      emojiEl.remove();
    }, 800);
  }
}

// Blooper Snapshot Capture
function captureBlooperFrame(reason) {
  const now = Date.now();
  if (now - lastBlooperTime < 2500 || blooperSnapshots.length >= 4) return;
  lastBlooperTime = now;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 160;
  tempCanvas.height = 120;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(videoElement, 0, 0, 160, 120);

  blooperSnapshots.push({
    dataUrl: tempCanvas.toDataURL('image/png'),
    reason: reason,
    task: TASKS[Math.min(currentTaskIdx, TASKS.length - 1)].title
  });
}

// MediaPipe Setup
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => { await faceMesh.send({ image: videoElement }); },
  width: 640,
  height: 480
});
camera.start();

function resetMetrics() {
  metrics = { totalJitter: 0, blinks: 0, isEyeClosed: false, maxTilt: 0, mouthTremor: 0, samples: 0 };
  lastLandmarks = null;
  blooperSnapshots = [];
  document.getElementById('stat-jitter').innerText = '0.00 px';
  document.getElementById('stat-blinks').innerText = '0';
  document.getElementById('stat-tilt').innerText = '0.0°';
  document.getElementById('stat-mouth').innerText = '0.00';
}

function startTaskSequence() {
  if (currentTaskIdx === 0) resetMetrics();

  if (currentTaskIdx >= TASKS.length) {
    showFinalVerdict();
    return;
  }

  const task = TASKS[currentTaskIdx];
  document.getElementById('task-badge').innerText = `TASK ${task.id} OF 6`;
  document.getElementById('task-title').innerText = task.title;
  document.getElementById('task-instruction').innerText = task.desc;
  
  playTaskChime();

  timeRemaining = task.duration;
  const timerBar = document.getElementById('timer-bar');
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeRemaining -= 0.1;
    const pct = Math.max(0, (timeRemaining / task.duration) * 100);
    timerBar.style.width = `${pct}%`;

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      currentTaskIdx++;
      startTaskSequence();
    }
  }, 100);
}

function restartEvaluation() {
  currentTaskIdx = 0;
  document.getElementById('verdict-box').classList.add('hidden');
  startTaskSequence();
}

function onResults(results) {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    drawCustomMesh(landmarks);
    analyzeMetrics(landmarks);
  }
  canvasCtx.restore();
}

function drawCustomMesh(landmarks) {
  canvasCtx.fillStyle = '#ffe600';
  landmarks.forEach((pt, i) => {
    if (i % 4 === 0) {
      canvasCtx.beginPath();
      canvasCtx.arc(pt.x * canvasElement.width, pt.y * canvasElement.height, 2, 0, 2 * Math.PI);
      canvasCtx.fill();
    }
  });
}

function analyzeMetrics(landmarks) {
  const noseTip = landmarks[1];
  const leftEyeUpper = landmarks[159];
  const leftEyeLower = landmarks[145];
  const mouthTop = landmarks[13];
  const mouthBottom = landmarks[14];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];

  // 1. Calculate Jitter
  if (lastLandmarks) {
    const dx = (noseTip.x - lastLandmarks.x) * canvasElement.width;
    const dy = (noseTip.y - lastLandmarks.y) * canvasElement.height;
    const dist = Math.sqrt(dx * dx + dy * dy);
    metrics.totalJitter += dist;
    document.getElementById('stat-jitter').innerText = `${dist.toFixed(2)} px`;

    if (dist > 3.8) {
      playSoftWarning();
      triggerEmojiBurst(noseTip.x, noseTip.y);
      showInstantFailMeme(noseTip.x, noseTip.y);
      captureBlooperFrame('HIGH JITTER');
      document.body.classList.add('glitch-red');
      setTimeout(() => document.body.classList.remove('glitch-red'), 100);
    }
  }
  lastLandmarks = noseTip;

  // 2. Blink Detection
  const eyeDist = Math.abs(leftEyeUpper.y - leftEyeLower.y);
  if (eyeDist < 0.015 && !metrics.isEyeClosed) {
    metrics.blinks++;
    metrics.isEyeClosed = true;
    document.getElementById('stat-blinks').innerText = metrics.blinks;
    playBubblePop();
    triggerEmojiBurst(leftEyeUpper.x, leftEyeUpper.y);
    showInstantFailMeme(leftEyeUpper.x, leftEyeUpper.y);
    captureBlooperFrame('BLINK CAUGHT');
  } else if (eyeDist >= 0.018) {
    metrics.isEyeClosed = false;
  }

  // 3. Head Tilt
  const dyEars = rightEar.y - leftEar.y;
  const dxEars = rightEar.x - leftEar.x;
  const angle = Math.abs(Math.atan2(dyEars, dxEars) * (180 / Math.PI));
  metrics.maxTilt = Math.max(metrics.maxTilt, angle);
  document.getElementById('stat-tilt').innerText = `${angle.toFixed(1)}°`;

  // 4. Mouth Tremor
  const mouthOpening = Math.abs(mouthTop.y - mouthBottom.y) * 100;
  metrics.mouthTremor += mouthOpening;
  document.getElementById('stat-mouth').innerText = mouthOpening.toFixed(2);

  metrics.samples++;
}

window.addEventListener('load', () => {
  setTimeout(startTaskSequence, 2000);
});

function showFinalVerdict() {
  document.getElementById('verdict-box').classList.remove('hidden');
  
  const avgJitter = metrics.totalJitter / (metrics.samples || 1);
  const jitterDeduction = avgJitter * 14;
  const blinkDeduction = metrics.blinks * 4.5;
  const rawScore = 100 - jitterDeduction - blinkDeduction;
  
  const finalScore = Math.min(99.87, Math.max(3.14, rawScore)).toFixed(2);

  let rank = "JIGGLY BOBA PEARL 🧋";
  if (finalScore > 80) rank = "ZEN MASTER 🧘‍♂️";
  else if (finalScore > 50) rank = "WOBBLY PENGUIN 🐧";
  else if (finalScore > 25) rank = "HYPERACTIVE HAMSTER 🐹";

  playTaskChime();

  // Generate Bloopers HTML
  let bloopersHTML = '';
  if (blooperSnapshots.length > 0) {
    bloopersHTML = `
      <div style="margin-top:15px; text-align:center;">
        <h4 style="color:var(--neon-pink); margin-bottom:10px;">📸 CAUGHT ON CAMERA (BLOOPERS)</h4>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          ${blooperSnapshots.map(b => `
            <div style="background:#fff; color:#000; padding:6px; border-radius:6px; width:130px; font-size:11px; text-align:center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
              <img src="${b.dataUrl}" style="width:100%; border-radius:4px;" />
              <strong style="color:#d00; display:block; margin-top:4px;">${b.reason}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  document.getElementById('report-content').innerHTML = `
    <p><strong>STILLNESS SCORE:</strong> <span style="color:var(--neon-yellow);">${finalScore}%</span></p>
    <p><strong>HUMAN RANK:</strong> <span style="color:var(--neon-cyan);">${rank}</span></p>
    <p><strong>UNNECESSARY BLINKS:</strong> ${metrics.blinks} 👁️</p>
    <p><strong>TOTAL WIGGLES:</strong> ${metrics.totalJitter.toFixed(1)} px 〰️</p>
    <p><strong>MAX HEAD TILT:</strong> ${metrics.maxTilt.toFixed(1)}° 📐</p>
    ${bloopersHTML}
    <br>
    <button onclick="downloadCertificate('${finalScore}', '${rank}')" style="background:#00ffcc; color:#000; border:none; padding:10px 18px; font-weight:bold; border-radius:8px; cursor:pointer; margin-top:10px;">📜 Download Stillness Certificate</button>
  `;
}

// Download Certificate Image
function downloadCertificate(score, rank) {
  const certCanvas = document.createElement('canvas');
  certCanvas.width = 800;
  certCanvas.height = 500;
  const ctx = certCanvas.getContext('2d');

  ctx.fillStyle = '#0f0f1b';
  ctx.fillRect(0, 0, 800, 500);

  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 760, 460);

  ctx.fillStyle = '#ffe600';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF HUMAN STILLNESS', 400, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Official AI Facial Stability Evaluation', 400, 130);

  ctx.fillStyle = '#00ffcc';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText(`${score}%`, 400, 230);

  ctx.fillStyle = '#ff007f';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`RANK: ${rank}`, 400, 300);

  ctx.fillStyle = '#cccccc';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Blinks: ${metrics.blinks}  |  Total Jitter: ${metrics.totalJitter.toFixed(1)} px`, 400, 370);

  ctx.fillStyle = '#ffe600';
  ctx.font = 'italic 16px sans-serif';
  ctx.fillText('Verified by FaceMesh Vision AI', 400, 430);

  const link = document.createElement('a');
  link.download = 'Human_Stillness_Certificate.png';
  link.href = certCanvas.toDataURL('image/png');
  link.click();
}