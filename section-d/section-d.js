class SectionDApp {
  constructor() {
    this.passages = [];
    this.pIndex = 0;
    this.qIndex = 0;
    this.answers = [];
    this.played = [];
    this.timer = null;
    this.start = null;
    this.audioTimer = null;
    this.init();
  }

  async init() {
    this.passages = await this.fetchJson('../section_d_passages.json');
    this.answers = this.passages.map(p => new Array(p.questions.length).fill(null));
    this.played = new Array(this.passages.length).fill(false);
    this.bind();
    this.startTimer();
    this.render();
  }

  async fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load section D');
    return await res.json();
  }

  bind() {
    document.getElementById('play-btn').addEventListener('click', () => this.playPassage());
    document.querySelectorAll('input[name="ans"]').forEach(i => i.addEventListener('change', (e) => this.select(parseInt(e.target.value, 10))));
    document.querySelectorAll('.option[data-option]').forEach((el, idx) => el.addEventListener('click', () => this.select(idx)));
    document.getElementById('next-btn').addEventListener('click', () => this.next());
    document.getElementById('finish-btn').addEventListener('click', () => this.finish());
  }

  startTimer() {
    this.start = Date.now();
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.start) / 1000);
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
  }

  render() {
    this.stopMedia();
    const p = this.passages[this.pIndex];
    const q = p.questions[this.qIndex];

    document.getElementById('counter').textContent = `Passage ${this.pIndex + 1} - Question ${this.qIndex + 1} of ${p.questions.length}`;
    document.getElementById('question').textContent = q.question;
    q.options.forEach((opt, i) => { document.getElementById(`l${i}`).textContent = opt; });

    document.getElementById('play-btn').disabled = this.played[this.pIndex];
    document.querySelectorAll('input[name="ans"]').forEach(i => i.checked = false);
    const s = this.answers[this.pIndex][this.qIndex];
    if (s !== null) document.getElementById(`o${s}`).checked = true;

    const isFinal = this.pIndex === this.passages.length - 1 && this.qIndex === p.questions.length - 1;
    document.getElementById('next-btn').style.display = isFinal ? 'none' : 'inline-block';
    document.getElementById('finish-btn').style.display = isFinal ? 'inline-block' : 'none';
  }

  playPassage() {
    if (this.played[this.pIndex]) return;
    const p = this.passages[this.pIndex];
    this.played[this.pIndex] = true;
    document.getElementById('play-btn').disabled = true;

    this.stopMedia();
    const warmup = new SpeechSynthesisUtterance('warm up start');
    warmup.volume = 0;
    const actual = new SpeechSynthesisUtterance(p.passage);
    actual.rate = 0.95;
    warmup.onend = () => window.speechSynthesis.speak(actual);
    warmup.onerror = () => window.speechSynthesis.speak(actual);

    this.audioTimer = setTimeout(() => {
      window.speechSynthesis.speak(warmup);
      this.audioTimer = null;
    }, 0);
  }

  select(i) {
    this.answers[this.pIndex][this.qIndex] = i;
  }

  next() {
    const p = this.passages[this.pIndex];
    if (this.qIndex < p.questions.length - 1) {
      this.qIndex++;
    } else if (this.pIndex < this.passages.length - 1) {
      this.pIndex++;
      this.qIndex = 0;
    }
    this.render();
  }

  finish() {
    this.stopMedia();
    clearInterval(this.timer);
    let score = 0;
    let total = 0;
    this.passages.forEach((p, pi) => {
      p.questions.forEach((q, qi) => {
        total++;
        if (this.answers[pi][qi] === q.correct) score++;
      });
    });
    const percentage = total ? Math.round((score / total) * 100) : 0;

    document.querySelector('main').innerHTML = `
      <div class="results-card">
        <h2>Section D Completed</h2>
        <div class="score-display">
          <div class="score-circle" style="--percentage:${percentage * 3.6}deg"><span>${percentage}%</span></div>
          <div class="score-details"><p>Score: ${score} / ${total}</p></div>
        </div>
        <div class="action-buttons">
          <a class="btn btn-secondary" href="../">Home</a>
          <a class="btn btn-primary" href="./">Retry Section D</a>
        </div>
      </div>
    `;
  }
}

new SectionDApp();
