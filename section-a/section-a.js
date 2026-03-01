class SectionAApp {
  constructor() {
    this.questions = [];
    this.index = 0;
    this.scores = [];
    this.audioPlayed = [];
    this.startTime = null;
    this.timer = null;
    this.recognition = null;
    this.audioTimer = null;
    this.listenBufferMs = 2000;
    this.init();
  }

  async init() {
    this.questions = await this.fetchJson('../section_a_questions.json');
    this.scores = new Array(this.questions.length).fill(false);
    this.audioPlayed = new Array(this.questions.length).fill(false);
    this.bindEvents();
    this.startTimer();
    this.render();
  }

  async fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load section A');
    return await res.json();
  }

  bindEvents() {
    document.getElementById('play-btn').addEventListener('click', () => this.playAudio());
    document.getElementById('record-btn').addEventListener('click', () => this.record());
    document.getElementById('next-btn').addEventListener('click', () => this.next());
    document.getElementById('finish-btn').addEventListener('click', () => this.finish());
  }

  startTimer() {
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `Time: ${mm}:${ss}`;
    }, 1000);
  }

  stopMedia() {
    if (this.audioTimer) {
      clearTimeout(this.audioTimer);
      this.audioTimer = null;
    }
    window.speechSynthesis.cancel();
    if (this.recognition) {
      try { this.recognition.abort(); } catch (_) {}
      this.recognition = null;
    }
  }

  normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  accuracy(spoken, expected) {
    const a = this.normalize(spoken).split(' ').filter(Boolean);
    const b = this.normalize(expected).split(' ').filter(Boolean);
    if (!b.length) return 0;
    let match = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) match++;
    }
    return Math.round((match / b.length) * 100);
  }

  render() {
    this.stopMedia();
    const item = this.questions[this.index];
    document.getElementById('counter').textContent = `Question ${this.index + 1} of ${this.questions.length}`;
    document.getElementById('prompt-title').textContent = item.type === 'speak_aloud' ? 'Speak Aloud' : 'Repeat Sentence';

    const promptBox = document.getElementById('prompt-box');
    const playBtn = document.getElementById('play-btn');

    if (item.type === 'speak_aloud') {
      promptBox.innerHTML = `<p><strong>Read and speak:</strong> ${item.sentence}</p>`;
      playBtn.disabled = true;
    } else {
      promptBox.innerHTML = '<p><strong>Listen once and repeat.</strong></p>';
      playBtn.disabled = this.audioPlayed[this.index];
    }

    document.getElementById('feedback').style.display = 'none';
    const isLast = this.index === this.questions.length - 1;
    document.getElementById('next-btn').style.display = isLast ? 'none' : 'inline-block';
    document.getElementById('finish-btn').style.display = isLast ? 'inline-block' : 'none';
  }

  playAudio() {
    const item = this.questions[this.index];
    if (item.type !== 'repeat_audio' || this.audioPlayed[this.index]) return;

    this.audioPlayed[this.index] = true;
    document.getElementById('play-btn').disabled = true;

    this.stopMedia();
    const warmup = new SpeechSynthesisUtterance('warm up start');
    warmup.volume = 0;
    const actual = new SpeechSynthesisUtterance(item.sentence);
    actual.rate = 0.93;
    warmup.onend = () => window.speechSynthesis.speak(actual);
    warmup.onerror = () => window.speechSynthesis.speak(actual);

    this.audioTimer = setTimeout(() => {
      window.speechSynthesis.speak(warmup);
      this.audioTimer = null;
    }, 0);
  }

  record() {
    const item = this.questions[this.index];
    if (item.type === 'repeat_audio' && !this.audioPlayed[this.index]) {
      alert('Play audio first.');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not supported.');
      return;
    }

    const feedback = document.getElementById('feedback');
    const recognition = new SR();
    this.recognition = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let got = false;
    const timeout = setTimeout(() => recognition.stop(), 9000 + this.listenBufferMs);

    recognition.onresult = (e) => {
      got = true;
      clearTimeout(timeout);
      const spoken = e.results[0][0].transcript;
      const acc = this.accuracy(spoken, item.sentence);
      const ok = acc >= 80;
      this.scores[this.index] = ok;
      feedback.innerHTML = `<p><strong>You said:</strong> ${spoken}</p><p><strong>Expected:</strong> ${item.sentence}</p><p><strong>Match:</strong> ${acc}% ${ok ? '(Accepted)' : '(Try again)'}</p>`;
      feedback.style.display = 'block';
    };

    recognition.onerror = () => {
      clearTimeout(timeout);
      this.recognition = null;
      feedback.innerHTML = '<p><strong>Could not capture audio. Try again.</strong></p>';
      feedback.style.display = 'block';
    };

    recognition.onend = () => {
      clearTimeout(timeout);
      this.recognition = null;
      if (!got) {
        feedback.innerHTML = '<p><strong>No speech detected. Try again.</strong></p>';
        feedback.style.display = 'block';
      }
    };

    recognition.start();
  }

  next() {
    if (this.index < this.questions.length - 1) {
      this.index++;
      this.render();
    }
  }

  finish() {
    this.stopMedia();
    clearInterval(this.timer);
    const score = this.scores.filter(Boolean).length;
    const total = this.questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;

    document.querySelector('main').innerHTML = `
      <div class="results-card">
        <h2>Section A Completed</h2>
        <div class="score-display">
          <div class="score-circle" style="--percentage:${percentage * 3.6}deg"><span>${percentage}%</span></div>
          <div class="score-details"><p>Score: ${score} / ${total}</p></div>
        </div>
        <div class="action-buttons">
          <a class="btn btn-secondary" href="../">Home</a>
          <a class="btn btn-primary" href="./">Retry Section A</a>
        </div>
      </div>
    `;
  }
}

new SectionAApp();
