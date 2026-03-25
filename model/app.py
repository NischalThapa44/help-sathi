"""
Help Sathi — Voice Distress Detection
Local inference app with microphone interface
Run: python app.py
Then open: http://localhost:5000
"""

from flask import Flask, render_template_string, request, jsonify
import torch
import librosa
import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write
import os
import sys
import base64
import tempfile
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# ─────────────────────────────────────────
# SETTINGS — update these paths
# ─────────────────────────────────────────
MODEL_PATH      = "experiments/nepali/cnn18gru/best_model.pth"
SAMPLE_RATE     = 16000
DURATION        = 3
DEVICE          = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CONFIDENCE_THRESHOLD = 80.0

# ✅ Exact from config.py
EMOTION_CLASSES  = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
HIDDEN_DIM       = 64
GRU_LAYERS       = 1
DISTRESS_EMOTIONS = ['angry', 'fear', 'disgust', 'sad']

# ─────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────
model = None

def load_model():
    global model
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

        # ✅ Fix 1 — correct file name: cnn_n_gru not cnn_gru
        from models.cnn_n_gru import CNN18GRU

        # ✅ Fix 2 — exact params from config.py
        m = CNN18GRU(
            n_input    = 1,                     # raw mono waveform
            hidden_dim = HIDDEN_DIM,            # 64
            n_layers   = GRU_LAYERS,            # 1
            n_output   = len(EMOTION_CLASSES),  # 7
            stride     = 4,
            n_channel  = 18,
            dropout    = 0.0
        ).to(DEVICE)

        checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

        # Handle all possible checkpoint formats
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                m.load_state_dict(checkpoint['model_state_dict'])
            elif 'state_dict' in checkpoint:
                m.load_state_dict(checkpoint['state_dict'])
            else:
                m.load_state_dict(checkpoint)
        else:
            m.load_state_dict(checkpoint)

        m.eval()
        model = m
        print(f"✅ Model loaded | Device: {DEVICE} | Emotions: {EMOTION_CLASSES}")

    except Exception as e:
        print(f"❌ Model load error: {e}")
        model = None
# ─────────────────────────────────────────
# PREPROCESS AUDIO
# ─────────────────────────────────────────
def preprocess_audio(audio_path):
    # Load at 16kHz mono — same as training
    audio, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    
    # NO normalization — let model handle raw values
    # (remove normalization if model was trained without it)
    
    # Trim silence first
    audio, _ = librosa.effects.trim(audio, top_db=20)
    
    # Use 3 seconds — matches TESS clip length
    target_length = SAMPLE_RATE * 3
    if len(audio) > target_length:
        audio = audio[:target_length]
    elif len(audio) < target_length:
        audio = np.pad(audio, (0, target_length - len(audio)))

    waveform = torch.tensor(audio, dtype=torch.float32)
    waveform = waveform.unsqueeze(0).unsqueeze(0)  # (1, 1, 48000)
    return waveform.to(DEVICE)
# ─────────────────────────────────────────
# PREDICT
# ─────────────────────────────────────────
def predict(audio_path):
    if model is None:
        return {"error": "Model not loaded. Check MODEL_PATH."}
    try:
        waveform = preprocess_audio(audio_path)

        # ✅ Fix 3 — CNN-GRU needs hidden state h
        h = model.init_hidden(batch_size=1, device=DEVICE)

        with torch.no_grad():
            # ✅ Fix 4 — forward returns (log_softmax_output, hidden)
            output, h = model(waveform, h)

            # ✅ Fix 5 — output is log_softmax, use exp() not softmax()
            probs = torch.exp(output)[0]
            idx   = torch.argmax(probs).item()
            conf  = probs[idx].item() * 100

        emotion     = EMOTION_CLASSES[idx]
        is_distress = emotion in DISTRESS_EMOTIONS
        sos_trigger = is_distress and conf >= CONFIDENCE_THRESHOLD

        return {
            "emotion":    emotion,
            "confidence": round(conf, 2),
            "is_distress": is_distress,
            "sos_trigger": sos_trigger,
            "all_probs":  {
                e: round(probs[i].item() * 100, 2)
                for i, e in enumerate(EMOTION_CLASSES)
            }
        }

    except Exception as e:
        return {"error": str(e)}
# ─────────────────────────────────────────
# HTML TEMPLATE
# ─────────────────────────────────────────
HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Help Sathi — Voice Distress Detection</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:        #0a0a0f;
    --surface:   #111118;
    --border:    #1e1e2e;
    --accent:    #ff3b5c;
    --safe:      #00e5a0;
    --warn:      #ffaa00;
    --text:      #e8e8f0;
    --muted:     #555570;
    --glow-red:  0 0 40px rgba(255,59,92,0.4);
    --glow-green:0 0 40px rgba(0,229,160,0.4);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Syne', sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at 30% 20%, rgba(255,59,92,0.05) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 80%, rgba(0,229,160,0.04) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .container {
    width: 100%;
    max-width: 700px;
    position: relative;
    z-index: 1;
  }

  /* HEADER */
  header {
    text-align: center;
    margin-bottom: 48px;
  }
  .logo {
    font-size: 11px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: var(--muted);
    font-family: 'Space Mono', monospace;
    margin-bottom: 12px;
  }
  h1 {
    font-size: clamp(32px, 6vw, 52px);
    font-weight: 800;
    line-height: 1;
    color: var(--text);
  }
  h1 span { color: var(--accent); }
  .subtitle {
    margin-top: 12px;
    font-size: 14px;
    color: var(--muted);
    font-family: 'Space Mono', monospace;
  }

  /* STATUS BADGE */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 100px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 16px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--safe);
    animation: pulse-dot 2s infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.8); }
  }

  /* MIC CARD */
  .mic-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 48px 40px;
    text-align: center;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.3s;
  }
  .mic-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(255,59,92,0.06) 0%, transparent 60%);
    pointer-events: none;
  }

  /* VISUALIZER */
  .visualizer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 60px;
    margin-bottom: 32px;
  }
  .bar {
    width: 4px;
    border-radius: 4px;
    background: var(--border);
    transition: height 0.1s ease, background 0.3s;
    animation: none;
  }
  .bar.active {
    background: var(--accent);
    animation: wave var(--delay, 0.3s) ease-in-out infinite alternate;
  }
  @keyframes wave {
    from { height: 6px; }
    to   { height: var(--h, 40px); }
  }

  /* MIC BUTTON */
  .mic-btn {
    width: 100px; height: 100px;
    border-radius: 50%;
    border: 2px solid var(--border);
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
  }
  .mic-btn:hover { transform: scale(1.07); border-color: var(--accent); }
  .mic-btn.recording {
    border-color: var(--accent);
    background: rgba(255,59,92,0.1);
    box-shadow: var(--glow-red);
    animation: mic-pulse 1s ease-in-out infinite;
  }
  @keyframes mic-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(255,59,92,0.3); }
    50%       { box-shadow: 0 0 50px rgba(255,59,92,0.6); }
  }
  .mic-btn svg { width: 36px; height: 36px; transition: transform 0.3s; }
  .mic-btn.recording svg { transform: scale(1.1); }

  .mic-label {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    transition: color 0.3s;
  }
  .mic-label.recording { color: var(--accent); }

  /* COUNTDOWN */
  .countdown {
    font-size: 48px;
    font-weight: 800;
    color: var(--accent);
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Mono', monospace;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .countdown.visible { opacity: 1; }

  /* FILE UPLOAD */
  .upload-zone {
    border: 1.5px dashed var(--border);
    border-radius: 14px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 14px;
    text-align: left;
  }
  .upload-zone:hover { border-color: var(--muted); background: rgba(255,255,255,0.02); }
  .upload-icon {
    width: 42px; height: 42px;
    border-radius: 10px;
    background: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .upload-text { font-size: 14px; color: var(--muted); line-height: 1.5; }
  .upload-text strong { display: block; color: var(--text); font-size: 15px; margin-bottom: 2px; }
  #file-input { display: none; }

  /* DIVIDER */
  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 2px;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* RESULT CARD */
  .result-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 36px 40px;
    display: none;
    animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .result-card.visible { display: block; }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .result-card.distress {
    border-color: rgba(255,59,92,0.4);
    box-shadow: var(--glow-red);
  }
  .result-card.safe {
    border-color: rgba(0,229,160,0.3);
    box-shadow: var(--glow-green);
  }

  /* VERDICT */
  .verdict {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--border);
  }
  .verdict-icon {
    width: 56px; height: 56px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
  }
  .verdict-icon.distress { background: rgba(255,59,92,0.15); }
  .verdict-icon.safe     { background: rgba(0,229,160,0.12); }

  .verdict-text .label {
    font-size: 11px;
    font-family: 'Space Mono', monospace;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .verdict-text .value {
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
  }
  .verdict-text .value.distress { color: var(--accent); }
  .verdict-text .value.safe     { color: var(--safe); }

  .confidence-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }
  .conf-num {
    font-family: 'Space Mono', monospace;
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
  }
  .conf-bar-wrap {
    flex: 1;
    height: 6px;
    background: var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .conf-bar {
    height: 100%;
    border-radius: 6px;
    transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .conf-bar.distress { background: var(--accent); }
  .conf-bar.safe     { background: var(--safe); }

  /* SOS ALERT */
  .sos-alert {
    padding: 14px 18px;
    border-radius: 12px;
    background: rgba(255,59,92,0.1);
    border: 1px solid rgba(255,59,92,0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    animation: sos-blink 1.5s ease-in-out infinite;
  }
  @keyframes sos-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.7; }
  }

  /* EMOTION BARS */
  .emotions-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .emotion-row {
    display: grid;
    grid-template-columns: 90px 1fr 52px;
    align-items: center;
    gap: 12px;
  }
  .emotion-name {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .emotion-name.highlight { color: var(--text); font-weight: 700; }
  .emo-bar-wrap {
    height: 8px;
    background: var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .emo-bar {
    height: 100%;
    border-radius: 8px;
    background: var(--muted);
    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .emo-bar.top-distress { background: var(--accent); }
  .emo-bar.top-safe     { background: var(--safe); }
  .emo-pct {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    text-align: right;
  }
  .emo-pct.highlight { color: var(--text); }

  /* SECTION LABEL */
  .section-label {
    font-size: 11px;
    font-family: 'Space Mono', monospace;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 14px;
  }

  /* LOADING */
  .loading {
    display: none;
    text-align: center;
    padding: 32px;
  }
  .loading.visible { display: block; }
  .spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 16px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    color: var(--muted);
    text-transform: uppercase;
  }

  /* ERROR */
  .error-msg {
    display: none;
    background: rgba(255,170,0,0.08);
    border: 1px solid rgba(255,170,0,0.25);
    border-radius: 12px;
    padding: 14px 18px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: var(--warn);
    margin-bottom: 20px;
  }
  .error-msg.visible { display: block; }

  /* FOOTER */
  footer {
    margin-top: 48px;
    text-align: center;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 1px;
  }
</style>
</head>
<body>

<div class="container">

  <!-- HEADER -->
  <header>
    <div class="logo">ACE078 · Tribhuvan University</div>
    <h1>Help <span>Sathi</span></h1>
    <p class="subtitle">Voice Distress Detection System</p>
    <div class="status-badge">
      <div class="dot"></div>
      <span id="model-status">Loading model...</span>
    </div>
  </header>

  <!-- MIC CARD -->
  <div class="mic-card">

    <!-- VISUALIZER -->
    <div class="visualizer" id="visualizer">
      <!-- bars generated by JS -->
    </div>

    <!-- MIC BUTTON -->
    <button class="mic-btn" id="mic-btn" onclick="toggleRecording()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3"/>
        <path d="M19 10a7 7 0 0 1-14 0"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    </button>

    <div class="mic-label" id="mic-label">Tap to record</div>
    <div class="countdown" id="countdown"></div>

    <div class="divider">or</div>

    <!-- FILE UPLOAD -->
    <div class="upload-zone" onclick="document.getElementById('file-input').click()">
      <div class="upload-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div class="upload-text">
        <strong>Upload Audio File</strong>
        .wav, .mp3, .ogg supported
      </div>
    </div>
    <input type="file" id="file-input" accept=".wav,.mp3,.ogg,.flac" onchange="handleFileUpload(event)">

  </div>

  <!-- ERROR -->
  <div class="error-msg" id="error-msg"></div>

  <!-- LOADING -->
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div class="loading-text">Analyzing audio...</div>
  </div>

  <!-- RESULT CARD -->
  <div class="result-card" id="result-card">

    <div id="sos-alert" class="sos-alert" style="display:none">
      🚨 SOS ALERT — High confidence distress detected!
    </div>

    <!-- VERDICT -->
    <div class="verdict">
      <div class="verdict-icon" id="verdict-icon">🎙</div>
      <div class="verdict-text">
        <div class="label">Detected Emotion</div>
        <div class="value" id="verdict-emotion">—</div>
        <div class="confidence-row">
          <span class="conf-num" id="conf-num">0%</span>
          <div class="conf-bar-wrap">
            <div class="conf-bar" id="conf-bar" style="width:0%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- EMOTION BREAKDOWN -->
    <div class="section-label">All Emotions</div>
    <div class="emotions-grid" id="emotions-grid"></div>

  </div>

  <footer>Help Sathi · CNN-18-GRU · TESS Dataset · {{ device }}</footer>

</div>

<script>
// ── State ──────────────────────────────────────────
let isRecording   = false;
let mediaRecorder = null;
let audioChunks   = [];
let countdownInt  = null;
let streamRef     = null;
let animFrameId   = null;
let analyserRef   = null;

const BARS        = 28;
const DURATION_S  = 3;

// ── Build visualizer bars ──────────────────────────
const viz = document.getElementById('visualizer');
for (let i = 0; i < BARS; i++) {
  const b = document.createElement('div');
  b.className = 'bar';
  b.style.height = '6px';
  b.style.setProperty('--delay', (Math.random() * 0.4 + 0.15) + 's');
  b.style.setProperty('--h', (Math.random() * 34 + 10) + 'px');
  viz.appendChild(b);
}
const bars = document.querySelectorAll('.bar');

// ── Check model status ─────────────────────────────
fetch('/status').then(r => r.json()).then(d => {
  document.getElementById('model-status').textContent =
    d.loaded ? `Model ready · ${d.device}` : 'Model not loaded';
}).catch(() => {
  document.getElementById('model-status').textContent = 'Server error';
});

// ── Audio visualizer animation ─────────────────────
function startVisualizerAnim(stream) {
  const ctx     = new AudioContext();
  const source  = ctx.createMediaStreamSource(stream);
  const analyser= ctx.createAnalyser();
  analyser.fftSize = 64;
  source.connect(analyser);
  analyserRef = analyser;
  const data = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    animFrameId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(data);
    bars.forEach((b, i) => {
      const v = data[i % data.length] || 0;
      const h = Math.max(6, (v / 255) * 52 + 6);
      b.style.height = h + 'px';
      b.classList.add('active');
    });
  }
  draw();
}

function stopVisualizerAnim() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  bars.forEach(b => {
    b.style.height = '6px';
    b.classList.remove('active');
  });
}

// ── Recording toggle ───────────────────────────────
async function toggleRecording() {
  if (isRecording) return;
  hideResult();
  hideError();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef = stream;
    isRecording = true;

    const btn   = document.getElementById('mic-btn');
    const label = document.getElementById('mic-label');
    const cd    = document.getElementById('countdown');

    btn.classList.add('recording');
    label.classList.add('recording');
    label.textContent = 'Recording...';
    cd.classList.add('visible');

    startVisualizerAnim(stream);

    // Countdown
    let remaining = DURATION_S;
    cd.textContent = remaining;
    countdownInt = setInterval(() => {
      remaining--;
      cd.textContent = remaining > 0 ? remaining : '✓';
      if (remaining <= 0) clearInterval(countdownInt);
    }, 1000);

    // Record
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => processRecording();
    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
      stream.getTracks().forEach(t => t.stop());
      stopVisualizerAnim();
      isRecording = false;
      btn.classList.remove('recording');
      label.classList.remove('recording');
      label.textContent = 'Tap to record';
      cd.classList.remove('visible');
    }, DURATION_S * 1000);

  } catch (err) {
    showError('Microphone access denied. Please allow mic permissions.');
    isRecording = false;
  }
}

// ── Process recording ──────────────────────────────
async function processRecording() {
  const blob = new Blob(audioChunks, { type: 'audio/webm' });
  const reader = new FileReader();
  reader.onload = async () => {
    const b64 = reader.result.split(',')[1];
    await sendAudio(b64, 'webm');
  };
  reader.readAsDataURL(blob);
}

// ── File upload ────────────────────────────────────
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  hideResult();
  hideError();
  const reader = new FileReader();
  reader.onload = async () => {
    const b64 = reader.result.split(',')[1];
    const ext  = file.name.split('.').pop().toLowerCase();
    await sendAudio(b64, ext);
  };
  reader.readAsDataURL(file);
}

// ── Send audio to server ───────────────────────────
async function sendAudio(b64data, format) {
  showLoading();
  try {
    const resp = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: b64data, format: format })
    });
    const result = await resp.json();
    hideLoading();
    if (result.error) { showError(result.error); return; }
    showResult(result);
  } catch (err) {
    hideLoading();
    showError('Server error: ' + err.message);
  }
}

// ── Show result ────────────────────────────────────
function showResult(r) {
  const card    = document.getElementById('result-card');
  const isD     = r.is_distress;
  const cls     = isD ? 'distress' : 'safe';

  card.className = `result-card visible ${cls}`;

  document.getElementById('sos-alert').style.display = r.sos_trigger ? 'flex' : 'none';
  document.getElementById('verdict-icon').className  = `verdict-icon ${cls}`;
  document.getElementById('verdict-icon').textContent = isD ? '⚠️' : '✅';

  const emotionEl = document.getElementById('verdict-emotion');
  emotionEl.className = `value ${cls}`;
  emotionEl.textContent = r.emotion.toUpperCase();

  document.getElementById('conf-num').textContent = r.confidence + '%';
  const bar = document.getElementById('conf-bar');
  bar.className = `conf-bar ${cls}`;
  setTimeout(() => bar.style.width = r.confidence + '%', 50);

  // Emotion breakdown
  const grid = document.getElementById('emotions-grid');
  grid.innerHTML = '';
  const distressEmotions = ['angry', 'fear', 'disgust', 'sad'];
  const sorted = Object.entries(r.all_probs).sort((a,b) => b[1]-a[1]);

  sorted.forEach(([emo, pct]) => {
    const isTop   = emo === r.emotion;
    const isDistE = distressEmotions.includes(emo);
    const barCls  = isTop ? (isDistE ? 'top-distress' : 'top-safe') : '';
    grid.innerHTML += `
      <div class="emotion-row">
        <div class="emotion-name ${isTop ? 'highlight' : ''}">${emo}</div>
        <div class="emo-bar-wrap">
          <div class="emo-bar ${barCls}" style="width:${pct}%"></div>
        </div>
        <div class="emo-pct ${isTop ? 'highlight' : ''}">${pct}%</div>
      </div>`;
  });
}

function hideResult()  { document.getElementById('result-card').className = 'result-card'; }
function showLoading() { document.getElementById('loading').className = 'loading visible'; }
function hideLoading() { document.getElementById('loading').className = 'loading'; }
function showError(msg){ const e = document.getElementById('error-msg'); e.textContent = msg; e.className = 'error-msg visible'; }
function hideError()   { document.getElementById('error-msg').className = 'error-msg'; }
</script>
</body>
</html>"""

# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────
@app.route('/')
def index():
    return render_template_string(HTML, device=str(DEVICE))

@app.route('/status')
def status():
    return jsonify({"loaded": model is not None, "device": str(DEVICE)})

@app.route('/predict', methods=['POST'])
def predict_route():
    data = request.get_json()
    b64  = data.get('audio')
    fmt  = data.get('format', 'wav')

    if not b64:
        return jsonify({"error": "No audio received"})

    try:
        audio_bytes = base64.b64decode(b64)
        suffix = f".{fmt}"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        # ✅ Convert non-wav using pydub instead of torchaudio
        if fmt != 'wav':
            try:
                from pydub import AudioSegment
                wav_path = tmp_path.replace(suffix, '.wav')
                audio    = AudioSegment.from_file(tmp_path)
                audio.export(wav_path, format='wav')
                os.unlink(tmp_path)
                tmp_path = wav_path
            except Exception as conv_err:
                # fallback — try librosa direct load (handles most formats)
                print(f"pydub failed: {conv_err}, trying librosa directly")

        result = predict(tmp_path)
        os.unlink(tmp_path)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)})
# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────
if __name__ == '__main__':
    load_model()
    print("\n" + "="*50)
    print("  Help Sathi — Voice Distress Detection")
    print("  Open: http://localhost:5000")
    print("="*50 + "\n")
    app.run(debug=False, host='0.0.0.0', port=5001)