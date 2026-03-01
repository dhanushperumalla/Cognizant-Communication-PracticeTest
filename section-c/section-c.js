class SectionCApp {
  constructor() {
    this.questions = [];
    this.index = 0;
    this.answers = [];
    this.start = null;
    this.timer = null;
    this.init();
  }

  async init() {
    this.questions = await this.fetchJson('../questions.json');
    this.answers = new Array(this.questions.length).fill(null);
    this.bind();
    this.startTimer();
    this.render();
  }

  async fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load section C');
    return await res.json();
  }

  bind() {
    document.querySelectorAll('input[name="ans"]').forEach(i => i.addEventListener('change', (e) => this.select(parseInt(e.target.value, 10))));
    document.querySelectorAll('.option[data-option]').forEach((el, idx) => el.addEventListener('click', () => this.select(idx)));
    document.getElementById('prev-btn').addEventListener('click', () => this.prev());
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

  applyStyle(selected, correct) {
    const selectedEl = document.querySelector(`.option[data-option="${selected}"]`);
    const correctEl = document.querySelector(`.option[data-option="${correct}"]`);
    if (selected === correct) {
      selectedEl.classList.add('option-correct', 'option-correct-answer');
    } else {
      selectedEl.classList.add('option-wrong');
      correctEl.classList.add('option-correct-answer');
    }
  }

  render() {
    const q = this.questions[this.index];
    document.getElementById('counter').textContent = `Question ${this.index + 1} of ${this.questions.length}`;
    document.getElementById('question').textContent = q.question;
    document.getElementById('topic').textContent = `Topic: ${q.topic}`;

    q.options.forEach((opt, i) => { document.getElementById(`l${i}`).textContent = opt; });
    document.querySelectorAll('input[name="ans"]').forEach(i => i.checked = false);
    document.querySelectorAll('.option[data-option]').forEach(el => el.classList.remove('option-correct','option-wrong','option-correct-answer','selected'));
    document.getElementById('feedback').style.display = 'none';

    const sel = this.answers[this.index];
    if (sel !== null) {
      document.getElementById(`o${sel}`).checked = true;
      this.applyStyle(sel, q.correct);
      const fb = document.getElementById('feedback');
      fb.innerHTML = `<p><strong>Explanation:</strong> ${q.explanation || 'No explanation.'}</p>`;
      fb.style.display = 'block';
    }

    document.getElementById('prev-btn').disabled = this.index === 0;
    const isLast = this.index === this.questions.length - 1;
    document.getElementById('next-btn').style.display = isLast ? 'none' : 'inline-block';
    document.getElementById('finish-btn').style.display = isLast ? 'inline-block' : 'none';
  }

  select(i) {
    this.answers[this.index] = i;
    this.render();
  }

  prev() {
    if (this.index > 0) {
      this.index--;
      this.render();
    }
  }

  next() {
    if (this.index < this.questions.length - 1) {
      this.index++;
      this.render();
    }
  }

  finish() {
    clearInterval(this.timer);
    let score = 0;
    this.answers.forEach((a, i) => { if (a === this.questions[i].correct) score++; });
    const total = this.questions.length;
    const percentage = total ? Math.round((score / total) * 100) : 0;

    document.querySelector('main').innerHTML = `
      <div class="results-card">
        <h2>Section C Completed</h2>
        <div class="score-display">
          <div class="score-circle" style="--percentage:${percentage * 3.6}deg"><span>${percentage}%</span></div>
          <div class="score-details"><p>Score: ${score} / ${total}</p></div>
        </div>
        <div class="action-buttons">
          <a class="btn btn-secondary" href="../">Home</a>
          <a class="btn btn-primary" href="./">Retry Section C</a>
        </div>
      </div>
    `;
  }
}

new SectionCApp();
