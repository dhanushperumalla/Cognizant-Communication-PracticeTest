class SectionBApp {
  constructor() {
    this.topics = [];
    this.index = 0;
    this.scores = [];
    this.recording = false;
    this.recognition = null;
    this.topicTimer = null;
    this.globalTimer = null;
    this.globalStart = null;
    this.left = 60;
    this.transcript = '';
    this.init();
  }

  async init() {
    this.topics = await this.fetchJson('../section_b_topics.json');
    this.scores = new Array(this.topics.length).fill(false);
    this.bind();
    this.startGlobalTimer();
    this.render();
  }

  async fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load section B');
    return await res.json();
  }

  bind() {
    document.getElementById('record-btn').addEventListener('click', () => this.record());
    document.getElementById('next-btn').addEventListener('click', () => this.next());
    document.getElementById('finish-btn').addEventListener('click', () => this.finish());
  }

  startGlobalTimer() {
    this.globalStart = Date.now();
    this.globalTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.globalStart) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `Time: ${mm}:${ss}`;
    }, 1000);
  }

  stopMedia() {
    if (this.topicTimer) {
      clearInterval(this.topicTimer);
      this.topicTimer = null;
    }
    if (this.recognition) {
      try { this.recognition.abort(); } catch (_) {}
      this.recognition = null;
    }
    this.recording = false;
  }

  normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  render() {
    this.stopMedia();
    const topic = this.topics[this.index];
    document.getElementById('counter').textContent = `Topic ${this.index + 1} of ${this.topics.length}`;
    document.getElementById('topic').innerHTML = `<strong>Topic:</strong> ${topic.topic}`;
    this.left = topic.durationSeconds || 60;
    document.getElementById('left').innerHTML = `<strong>Time Left:</strong> ${this.left}s`;
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('record-btn').disabled = false;
    document.getElementById('record-btn').textContent = 'Start 1 Minute Recording';

    const isLast = this.index === this.topics.length - 1;
    document.getElementById('next-btn').style.display = isLast ? 'none' : 'inline-block';
    document.getElementById('finish-btn').style.display = isLast ? 'inline-block' : 'none';
  }

  record() {
    if (this.recording) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not supported.');
      return;
    }

    const feedback = document.getElementById('feedback');
    const btn = document.getElementById('record-btn');
    const recognition = new SR();
    this.recognition = recognition;
    this.recording = true;
    this.transcript = '';
    btn.disabled = true;
    btn.textContent = 'Recording...';

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true;

    this.topicTimer = setInterval(() => {
      this.left--;
      document.getElementById('left').innerHTML = `<strong>Time Left:</strong> ${this.left}s`;
      if (this.left <= 0) {
        recognition.stop();
      }
    }, 1000);

    let finalized = false;
    recognition.onresult = (e) => {
      let chunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        chunk += ` ${e.results[i][0].transcript}`;
      }
      this.transcript += chunk;
    };

    recognition.onerror = () => {
      this.stopMedia();
      btn.disabled = false;
      btn.textContent = 'Start 1 Minute Recording';
      feedback.innerHTML = '<p><strong>Recording failed. Try again.</strong></p>';
      feedback.style.display = 'block';
    };

    recognition.onend = () => {
      if (finalized) return;
      finalized = true;
      this.stopMedia();
      btn.disabled = false;
      btn.textContent = 'Start 1 Minute Recording';

      const wc = this.normalize(this.transcript).split(' ').filter(Boolean).length;
      const ok = wc >= 35;
      this.scores[this.index] = ok;
      feedback.innerHTML = `<p><strong>Transcript:</strong> ${this.transcript.trim() || 'No speech captured'}</p><p><strong>Word Count:</strong> ${wc}</p><p><strong>Status:</strong> ${ok ? 'Accepted' : 'Too short, speak more next time.'}</p>`;
      feedback.style.display = 'block';
    };

    recognition.start();
  }

  next() {
    if (this.recording) {
      alert('Complete recording first.');
      return;
    }
    if (this.index < this.topics.length - 1) {
      this.index++;
      this.render();
    }
  }

  finish() {
    if (this.recording) {
      alert('Complete recording first.');
      return;
    }
    this.stopMedia();
    clearInterval(this.globalTimer);
    const score = this.scores.filter(Boolean).length;
    const total = this.topics.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;
    document.querySelector('main').innerHTML = `
      <div class="results-card">
        <h2>Section B Completed</h2>
        <div class="score-display">
          <div class="score-circle" style="--percentage:${percentage * 3.6}deg"><span>${percentage}%</span></div>
          <div class="score-details"><p>Score: ${score} / ${total}</p></div>
        </div>
        <div class="action-buttons">
          <a class="btn btn-secondary" href="../">Home</a>
          <a class="btn btn-primary" href="./">Retry Section B</a>
        </div>
      </div>
    `;
  }
}

new SectionBApp();
