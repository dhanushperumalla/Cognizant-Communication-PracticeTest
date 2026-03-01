class AssessmentApp {
    constructor() {
        this.sectionAQuestions = [];
        this.sectionBTopics = [];
        this.sectionCQuestions = [];
        this.sectionDPassages = [];

        this.sectionAIndex = 0;
        this.sectionAScores = [];
        this.sectionAAudioPlayed = [];

        this.sectionBIndex = 0;
        this.sectionBScores = [];
        this.sectionBTimer = null;
        this.sectionBSecondsLeft = 60;
        this.sectionBTranscript = '';
        this.sectionBRecording = false;

        this.sectionCIndex = 0;
        this.sectionCAnswers = [];

        this.sectionDPassageIndex = 0;
        this.sectionDQuestionIndex = 0;
        this.sectionDAnswers = [];
        this.sectionDPlayedPassages = [];

        this.recognition = null;
        this.globalTimer = null;
        this.sectionStartTime = null;

        this.speakingAudioTimer = null;
        this.speakingAudioDelayMs = 0;
        this.speakingRecordBufferMs = 2000;
        this.fullTestMode = false;
        this.pendingNextAction = null;
        const scriptElement = document.querySelector('script[src$="script.js"]');
        const scriptSrc = scriptElement ? scriptElement.getAttribute('src') : 'script.js';
        this.assetBaseUrl = new URL(scriptSrc, window.location.href);
        this.fullTestSectionScores = {
            A: { score: 0, total: 0 },
            B: { score: 0, total: 0 },
            C: { score: 0, total: 0 },
            D: { score: 0, total: 0 }
        };

        this.initialize();
    }

    async initialize() {
        try {
            await Promise.all([
                this.loadSectionData(),
            ]);
            this.setupEvents();
        } catch (error) {
            console.error(error);
            alert('Failed to load assessment data files.');
        }
    }

    async loadSectionData() {
        this.sectionAQuestions = await this.fetchJson('section_a_questions.json', []);
        this.sectionBTopics = await this.fetchJson('section_b_topics.json', []);
        this.sectionCQuestions = await this.fetchJson('questions.json', []);
        this.sectionDPassages = await this.fetchJson('section_d_passages.json', []);

        this.sectionAScores = new Array(this.sectionAQuestions.length).fill(false);
        this.sectionAAudioPlayed = new Array(this.sectionAQuestions.length).fill(false);

        this.sectionBScores = new Array(this.sectionBTopics.length).fill(false);

        this.sectionCAnswers = new Array(this.sectionCQuestions.length).fill(null);

        this.sectionDAnswers = this.sectionDPassages.map(p => new Array(p.questions.length).fill(null));
        this.sectionDPlayedPassages = new Array(this.sectionDPassages.length).fill(false);
    }

    async fetchJson(path, fallback) {
        try {
            const dataUrl = new URL(path, this.assetBaseUrl);
            const response = await fetch(dataUrl);
            if (!response.ok) {
                throw new Error(`Unable to load ${path}`);
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            return fallback;
        }
    }

    setupEvents() {
        const startFullTestBtn = document.getElementById('start-full-test');
        if (startFullTestBtn) {
            startFullTestBtn.addEventListener('click', () => this.startFullTest());
        }

        document.getElementById('start-section-a').addEventListener('click', () => this.startSectionA());
        document.getElementById('start-section-b').addEventListener('click', () => this.startSectionB());
        document.getElementById('start-section-c').addEventListener('click', () => this.startSectionC());
        document.getElementById('start-section-d').addEventListener('click', () => this.startSectionD());

        document.getElementById('section-a-play').addEventListener('click', () => this.playSectionAAudio());
        document.getElementById('section-a-record').addEventListener('click', () => this.recordSectionA());
        document.getElementById('section-a-next').addEventListener('click', () => this.nextSectionA());
        document.getElementById('section-a-finish').addEventListener('click', () => this.finishSectionA());

        document.getElementById('section-b-record').addEventListener('click', () => this.recordSectionB());
        document.getElementById('section-b-next').addEventListener('click', () => this.nextSectionB());
        document.getElementById('section-b-finish').addEventListener('click', () => this.finishSectionB());

        document.querySelectorAll('input[name="section-c-answer"]').forEach(input => {
            input.addEventListener('change', (event) => {
                this.selectSectionCOption(parseInt(event.target.value, 10));
            });
        });
        document.querySelectorAll('.option[data-option]').forEach((option, idx) => {
            option.addEventListener('click', () => this.selectSectionCOption(idx));
        });
        document.getElementById('section-c-prev').addEventListener('click', () => this.prevSectionC());
        document.getElementById('section-c-next').addEventListener('click', () => this.nextSectionC());
        document.getElementById('section-c-finish').addEventListener('click', () => this.finishSectionC());

        document.getElementById('section-d-play').addEventListener('click', () => this.playSectionDAudio());
        document.querySelectorAll('input[name="section-d-answer"]').forEach(input => {
            input.addEventListener('change', (event) => {
                this.selectSectionDOption(parseInt(event.target.value, 10));
            });
        });
        document.querySelectorAll('.option[data-d-option]').forEach((option, idx) => {
            option.addEventListener('click', () => this.selectSectionDOption(idx));
        });
        document.getElementById('section-d-next').addEventListener('click', () => this.nextSectionD());
        document.getElementById('section-d-finish').addEventListener('click', () => this.finishSectionD());

        document.getElementById('results-home').addEventListener('click', () => this.goHome());

        const resultsNextBtn = document.getElementById('results-next');
        if (resultsNextBtn) {
            resultsNextBtn.addEventListener('click', () => {
                if (typeof this.pendingNextAction === 'function') {
                    const action = this.pendingNextAction;
                    this.pendingNextAction = null;
                    action();
                }
            });
        }
    }

    async enterFullscreen() {
        if (document.fullscreenElement) {
            return;
        }

        try {
            await document.documentElement.requestFullscreen();
        } catch (error) {
            console.warn('Fullscreen request was not granted:', error);
        }
    }

    startFullTest() {
        this.fullTestMode = true;
        this.fullTestSectionScores = {
            A: { score: 0, total: this.sectionAQuestions.length },
            B: { score: 0, total: this.sectionBTopics.length },
            C: { score: 0, total: this.sectionCQuestions.length },
            D: { score: 0, total: this.sectionDPassages.reduce((sum, p) => sum + p.questions.length, 0) }
        };
        this.enterFullscreen();
        this.startSectionA();
    }

    getFullTestOverall() {
        const sectionKeys = ['A', 'B', 'C', 'D'];
        let score = 0;
        let total = 0;

        sectionKeys.forEach((key) => {
            score += this.fullTestSectionScores[key].score;
            total += this.fullTestSectionScores[key].total;
        });

        return { score, total };
    }

    renderFullTestSummary() {
        const summaryEl = document.getElementById('full-test-summary');
        if (!summaryEl) {
            return;
        }

        const overall = this.getFullTestOverall();
        const percentage = overall.total > 0 ? Math.round((overall.score / overall.total) * 100) : 0;

        summaryEl.innerHTML = `
            <p><strong>Section A:</strong> ${this.fullTestSectionScores.A.score} / ${this.fullTestSectionScores.A.total}</p>
            <p><strong>Section B:</strong> ${this.fullTestSectionScores.B.score} / ${this.fullTestSectionScores.B.total}</p>
            <p><strong>Section C:</strong> ${this.fullTestSectionScores.C.score} / ${this.fullTestSectionScores.C.total}</p>
            <p><strong>Section D:</strong> ${this.fullTestSectionScores.D.score} / ${this.fullTestSectionScores.D.total}</p>
            <p><strong>Overall:</strong> ${overall.score} / ${overall.total} (${percentage}%)</p>
        `;
        summaryEl.style.display = 'block';
    }

    showScreen(screenId) {
        this.stopActiveMedia();

        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            screen.style.display = 'none';
        });

        const target = document.getElementById(screenId);
        target.classList.add('active');
        target.style.display = screenId === 'section-c-screen' || screenId === 'section-d-screen' ? 'grid' : 'block';
    }

    stopActiveMedia() {
        if (this.speakingAudioTimer) {
            clearTimeout(this.speakingAudioTimer);
            this.speakingAudioTimer = null;
        }

        window.speechSynthesis.cancel();

        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch (error) {
                // no-op
            }
            this.recognition = null;
        }

        if (this.sectionBTimer) {
            clearInterval(this.sectionBTimer);
            this.sectionBTimer = null;
        }
    }

    startSectionTimer(label) {
        this.stopSectionTimer();
        this.sectionStartTime = new Date();
        document.getElementById('test-info').style.display = 'flex';
        document.getElementById('section-counter').textContent = label;

        this.globalTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sectionStartTime.getTime()) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('timer').textContent = `Time: ${minutes}:${seconds}`;
        }, 1000);
    }

    stopSectionTimer() {
        if (this.globalTimer) {
            clearInterval(this.globalTimer);
            this.globalTimer = null;
        }
    }

    getSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        return SpeechRecognition ? new SpeechRecognition() : null;
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    accuracyPercent(spoken, expected) {
        const spokenWords = this.normalizeText(spoken).split(' ').filter(Boolean);
        const expectedWords = this.normalizeText(expected).split(' ').filter(Boolean);

        if (!expectedWords.length) {
            return 0;
        }

        let matches = 0;
        for (let i = 0; i < Math.min(spokenWords.length, expectedWords.length); i++) {
            if (spokenWords[i] === expectedWords[i]) {
                matches++;
            }
        }

        return Math.round((matches / expectedWords.length) * 100);
    }

    showSectionResult(title, score, total, nextAction = null, nextLabel = 'Continue') {
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        document.getElementById('results-title').textContent = title;
        document.getElementById('results-score').textContent = score;
        document.getElementById('results-total').textContent = total;
        document.getElementById('results-percentage').textContent = percentage;
        document.getElementById('results-percent').textContent = `${percentage}%`;
        document.getElementById('results-circle').style.setProperty('--percentage', `${percentage * 3.6}deg`);

        const nextBtn = document.getElementById('results-next');
        const homeBtn = document.getElementById('results-home');
        const summaryEl = document.getElementById('full-test-summary');
        if (nextBtn) {
            if (nextAction) {
                this.pendingNextAction = nextAction;
                nextBtn.textContent = nextLabel;
                nextBtn.style.display = 'inline-block';
                if (summaryEl) {
                    summaryEl.style.display = 'none';
                }
                if (homeBtn) {
                    homeBtn.textContent = 'Exit Full Test';
                }
            } else {
                this.pendingNextAction = null;
                nextBtn.style.display = 'none';
                if (homeBtn) {
                    homeBtn.textContent = 'Back to Home';
                }
                if (this.fullTestMode && summaryEl) {
                    this.renderFullTestSummary();
                } else if (summaryEl) {
                    summaryEl.style.display = 'none';
                }
            }
        }

        this.showScreen('results-screen');
    }

    goHome() {
        this.stopSectionTimer();
        this.stopActiveMedia();
        this.fullTestMode = false;
        this.pendingNextAction = null;
        const summaryEl = document.getElementById('full-test-summary');
        if (summaryEl) {
            summaryEl.style.display = 'none';
        }
        document.getElementById('test-info').style.display = 'none';
        this.showScreen('start-screen');
    }

    startSectionA() {
        this.enterFullscreen();
        this.sectionAIndex = 0;
        this.sectionAScores.fill(false);
        this.sectionAAudioPlayed.fill(false);
        this.startSectionTimer('Section A');
        this.showScreen('section-a-screen');
        this.renderSectionA();
    }

    renderSectionA() {
        const item = this.sectionAQuestions[this.sectionAIndex];
        if (!item) {
            const prompt = document.getElementById('section-a-prompt');
            prompt.innerHTML = '<p><strong>Section A questions are unavailable. Please reload the page.</strong></p>';
            document.getElementById('section-a-play').disabled = true;
            document.getElementById('section-a-record').disabled = true;
            document.getElementById('section-a-next').style.display = 'none';
            document.getElementById('section-a-finish').style.display = 'none';
            return;
        }

        document.getElementById('section-a-record').disabled = false;
        document.getElementById('section-a-counter').textContent = `Question ${this.sectionAIndex + 1} of ${this.sectionAQuestions.length}`;

        const prompt = document.getElementById('section-a-prompt');
        const playBtn = document.getElementById('section-a-play');

        if (item.type === 'speak_aloud') {
            prompt.innerHTML = `<p><strong>Speak Aloud:</strong> ${item.sentence}</p>`;
            playBtn.disabled = true;
        } else {
            prompt.innerHTML = '<p><strong>Audio Repeat:</strong> Listen to the sentence and repeat it.</p>';
            playBtn.disabled = this.sectionAAudioPlayed[this.sectionAIndex];
        }

        document.getElementById('section-a-feedback').style.display = 'none';
        document.getElementById('section-a-next').style.display = this.sectionAIndex === this.sectionAQuestions.length - 1 ? 'none' : 'inline-block';
        document.getElementById('section-a-finish').style.display = this.sectionAIndex === this.sectionAQuestions.length - 1 ? 'inline-block' : 'none';
    }

    playSectionAAudio() {
        const item = this.sectionAQuestions[this.sectionAIndex];
        if (item.type !== 'repeat_audio' || this.sectionAAudioPlayed[this.sectionAIndex]) {
            return;
        }

        this.sectionAAudioPlayed[this.sectionAIndex] = true;
        document.getElementById('section-a-play').disabled = true;

        const preRoll = new SpeechSynthesisUtterance('warm up start');
        preRoll.volume = 0;
        const utterance = new SpeechSynthesisUtterance(item.sentence);
        utterance.rate = 0.92;

        const speakActual = () => {
            window.speechSynthesis.speak(utterance);
        };

        preRoll.onend = speakActual;
        preRoll.onerror = speakActual;

        this.stopActiveMedia();
        this.speakingAudioTimer = setTimeout(() => {
            window.speechSynthesis.speak(preRoll);
            this.speakingAudioTimer = null;
        }, this.speakingAudioDelayMs);
    }

    recordSectionA() {
        const item = this.sectionAQuestions[this.sectionAIndex];

        if (item.type === 'repeat_audio' && !this.sectionAAudioPlayed[this.sectionAIndex]) {
            alert('Please play the audio first for this question.');
            return;
        }

        const recognition = this.getSpeechRecognition();
        if (!recognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        const feedback = document.getElementById('section-a-feedback');
        this.recognition = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        let gotResult = false;

        const timeout = setTimeout(() => {
            recognition.stop();
        }, 7000 + this.speakingRecordBufferMs);

        recognition.onresult = (event) => {
            gotResult = true;
            clearTimeout(timeout);
            const spoken = event.results[0][0].transcript;
            const accuracy = this.accuracyPercent(spoken, item.sentence);
            const isCorrect = accuracy >= 80;
            this.sectionAScores[this.sectionAIndex] = isCorrect;

            feedback.innerHTML = `
                <p><strong>You said:</strong> ${spoken}</p>
                <p><strong>Expected:</strong> ${item.sentence}</p>
                <p><strong>Match:</strong> ${accuracy}% ${isCorrect ? '(Accepted)' : '(Needs improvement)'}</p>
            `;
            feedback.style.display = 'block';
        };

        recognition.onerror = () => {
            clearTimeout(timeout);
            this.recognition = null;
            feedback.innerHTML = '<p><strong>Could not capture clearly. Please record again.</strong></p>';
            feedback.style.display = 'block';
        };

        recognition.onend = () => {
            clearTimeout(timeout);
            this.recognition = null;
            if (!gotResult) {
                feedback.innerHTML = '<p><strong>No speech detected. Please try again.</strong></p>';
                feedback.style.display = 'block';
            }
        };

        recognition.start();
    }

    nextSectionA() {
        this.stopActiveMedia();
        if (this.sectionAIndex < this.sectionAQuestions.length - 1) {
            this.sectionAIndex++;
            this.renderSectionA();
        }
    }

    finishSectionA() {
        this.stopActiveMedia();
        const score = this.sectionAScores.filter(Boolean).length;
        if (this.fullTestMode) {
            this.fullTestSectionScores.A = { score, total: this.sectionAQuestions.length };
        }
        this.stopSectionTimer();
        if (this.fullTestMode) {
            this.showSectionResult('Section A Completed', score, this.sectionAQuestions.length, () => this.startSectionB(), 'Continue to Section B');
        } else {
            this.showSectionResult('Section A Completed', score, this.sectionAQuestions.length);
        }
    }

    startSectionB() {
        this.enterFullscreen();
        this.sectionBIndex = 0;
        this.sectionBScores.fill(false);
        this.startSectionTimer('Section B');
        this.showScreen('section-b-screen');
        this.renderSectionB();
    }

    renderSectionB() {
        const topic = this.sectionBTopics[this.sectionBIndex];
        document.getElementById('section-b-counter').textContent = `Topic ${this.sectionBIndex + 1} of ${this.sectionBTopics.length}`;
        document.getElementById('section-b-topic').innerHTML = `<strong>Topic:</strong> ${topic.topic}`;
        document.getElementById('section-b-time-left').innerHTML = `<strong>Time Left:</strong> ${topic.durationSeconds}s`;
        document.getElementById('section-b-feedback').style.display = 'none';
        document.getElementById('section-b-record').disabled = false;

        const isLast = this.sectionBIndex === this.sectionBTopics.length - 1;
        document.getElementById('section-b-next').style.display = isLast ? 'none' : 'inline-block';
        document.getElementById('section-b-finish').style.display = isLast ? 'inline-block' : 'inline-block';
        document.getElementById('section-b-finish').style.display = isLast ? 'inline-block' : 'none';
    }

    recordSectionB() {
        if (this.sectionBRecording) {
            return;
        }

        const recognition = this.getSpeechRecognition();
        if (!recognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        const topic = this.sectionBTopics[this.sectionBIndex];
        const feedback = document.getElementById('section-b-feedback');
        const recordBtn = document.getElementById('section-b-record');

        this.sectionBRecording = true;
        this.sectionBTranscript = '';
        this.sectionBSecondsLeft = topic.durationSeconds;
        recordBtn.disabled = true;
        recordBtn.textContent = 'Recording...';

        this.recognition = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = true;

        this.sectionBTimer = setInterval(() => {
            this.sectionBSecondsLeft--;
            document.getElementById('section-b-time-left').innerHTML = `<strong>Time Left:</strong> ${this.sectionBSecondsLeft}s`;
            if (this.sectionBSecondsLeft <= 0) {
                recognition.stop();
            }
        }, 1000);

        let finalized = false;

        recognition.onresult = (event) => {
            let combined = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                combined += ` ${event.results[i][0].transcript}`;
            }
            this.sectionBTranscript += combined;
        };

        recognition.onerror = () => {
            this.recognition = null;
            if (this.sectionBTimer) {
                clearInterval(this.sectionBTimer);
                this.sectionBTimer = null;
            }
            this.sectionBRecording = false;
            recordBtn.disabled = false;
            recordBtn.textContent = 'Start 1 Minute Recording';
            feedback.innerHTML = '<p><strong>Recording failed. Please try again.</strong></p>';
            feedback.style.display = 'block';
        };

        recognition.onend = () => {
            this.recognition = null;
            if (finalized) {
                return;
            }
            finalized = true;

            if (this.sectionBTimer) {
                clearInterval(this.sectionBTimer);
                this.sectionBTimer = null;
            }

            this.sectionBRecording = false;
            recordBtn.disabled = false;
            recordBtn.textContent = 'Start 1 Minute Recording';

            const wordCount = this.normalizeText(this.sectionBTranscript).split(' ').filter(Boolean).length;
            const isAcceptable = wordCount >= 35;
            this.sectionBScores[this.sectionBIndex] = isAcceptable;

            feedback.innerHTML = `
                <p><strong>Transcript:</strong> ${this.sectionBTranscript.trim() || 'No speech captured'}</p>
                <p><strong>Word Count:</strong> ${wordCount}</p>
                <p><strong>Status:</strong> ${isAcceptable ? 'Accepted' : 'Too short, please try to speak more.'}</p>
            `;
            feedback.style.display = 'block';
        };

        recognition.start();
    }

    nextSectionB() {
        if (this.sectionBRecording) {
            alert('Please complete recording first.');
            return;
        }
        this.stopActiveMedia();
        if (this.sectionBIndex < this.sectionBTopics.length - 1) {
            this.sectionBIndex++;
            this.renderSectionB();
        }
    }

    finishSectionB() {
        if (this.sectionBRecording) {
            alert('Please complete recording first.');
            return;
        }
        this.stopActiveMedia();
        const score = this.sectionBScores.filter(Boolean).length;
        if (this.fullTestMode) {
            this.fullTestSectionScores.B = { score, total: this.sectionBTopics.length };
        }
        this.stopSectionTimer();
        if (this.fullTestMode) {
            this.showSectionResult('Section B Completed', score, this.sectionBTopics.length, () => this.startSectionC(), 'Continue to Section C');
        } else {
            this.showSectionResult('Section B Completed', score, this.sectionBTopics.length);
        }
    }

    startSectionC() {
        this.enterFullscreen();
        this.sectionCIndex = 0;
        this.sectionCAnswers = new Array(this.sectionCQuestions.length).fill(null);
        this.startSectionTimer('Section C');
        this.showScreen('section-c-screen');
        this.renderSectionC();
    }

    renderSectionC() {
        const q = this.sectionCQuestions[this.sectionCIndex];
        document.getElementById('section-c-counter').textContent = `Question ${this.sectionCIndex + 1} of ${this.sectionCQuestions.length}`;
        document.getElementById('section-c-question').textContent = q.question;
        document.getElementById('section-c-topic').textContent = `Topic: ${q.topic}`;

        q.options.forEach((opt, idx) => {
            document.getElementById(`section-c-label${idx}`).textContent = opt;
        });

        document.querySelectorAll('input[name="section-c-answer"]').forEach(input => { input.checked = false; });
        document.querySelectorAll('.option[data-option]').forEach(el => {
            el.classList.remove('option-correct', 'option-wrong', 'option-correct-answer', 'selected');
        });

        document.getElementById('section-c-feedback').style.display = 'none';

        const selected = this.sectionCAnswers[this.sectionCIndex];
        if (selected !== null) {
            document.getElementById(`section-c-option${selected}`).checked = true;
            this.applyOptionStyle('.option[data-option="', selected, q.correct, 'section-c-feedback', q.explanation);
        }

        document.getElementById('section-c-prev').disabled = this.sectionCIndex === 0;
        const isLast = this.sectionCIndex === this.sectionCQuestions.length - 1;
        document.getElementById('section-c-next').style.display = isLast ? 'none' : 'inline-block';
        document.getElementById('section-c-finish').style.display = isLast ? 'inline-block' : 'none';
    }

    applyOptionStyle(prefix, selected, correct, feedbackId, explanationText) {
        const selectedEl = document.querySelector(`${prefix}${selected}"]`);
        const correctEl = document.querySelector(`${prefix}${correct}"]`);

        if (selected === correct) {
            selectedEl.classList.add('option-correct', 'option-correct-answer');
        } else {
            selectedEl.classList.add('option-wrong');
            correctEl.classList.add('option-correct-answer');
        }

        const feedback = document.getElementById(feedbackId);
        feedback.innerHTML = `<p><strong>Explanation:</strong> ${explanationText || 'No explanation available.'}</p>`;
        feedback.style.display = 'block';
    }

    selectSectionCOption(index) {
        this.sectionCAnswers[this.sectionCIndex] = index;
        this.renderSectionC();
    }

    prevSectionC() {
        if (this.sectionCIndex > 0) {
            this.sectionCIndex--;
            this.renderSectionC();
        }
    }

    nextSectionC() {
        if (this.sectionCIndex < this.sectionCQuestions.length - 1) {
            this.sectionCIndex++;
            this.renderSectionC();
        }
    }

    finishSectionC() {
        this.stopActiveMedia();
        let score = 0;
        this.sectionCAnswers.forEach((ans, idx) => {
            if (ans === this.sectionCQuestions[idx].correct) {
                score++;
            }
        });
        if (this.fullTestMode) {
            this.fullTestSectionScores.C = { score, total: this.sectionCQuestions.length };
        }
        this.stopSectionTimer();
        if (this.fullTestMode) {
            this.showSectionResult('Section C Completed', score, this.sectionCQuestions.length, () => this.startSectionD(), 'Continue to Section D');
        } else {
            this.showSectionResult('Section C Completed', score, this.sectionCQuestions.length);
        }
    }

    startSectionD() {
        this.enterFullscreen();
        this.sectionDPassageIndex = 0;
        this.sectionDQuestionIndex = 0;
        this.sectionDAnswers = this.sectionDPassages.map(p => new Array(p.questions.length).fill(null));
        this.sectionDPlayedPassages = new Array(this.sectionDPassages.length).fill(false);

        this.startSectionTimer('Section D');
        this.showScreen('section-d-screen');
        this.renderSectionD();
    }

    renderSectionD() {
        const passage = this.sectionDPassages[this.sectionDPassageIndex];
        const question = passage.questions[this.sectionDQuestionIndex];

        document.getElementById('section-d-title').textContent = `${passage.title}`;
        document.getElementById('section-d-counter').textContent = `Passage ${this.sectionDPassageIndex + 1} - Question ${this.sectionDQuestionIndex + 1} of ${passage.questions.length}`;

        document.getElementById('section-d-question').textContent = question.question;
        question.options.forEach((opt, idx) => {
            document.getElementById(`section-d-label${idx}`).textContent = opt;
        });

        document.getElementById('section-d-play').disabled = this.sectionDPlayedPassages[this.sectionDPassageIndex];

        document.querySelectorAll('input[name="section-d-answer"]').forEach(input => input.checked = false);
        const selected = this.sectionDAnswers[this.sectionDPassageIndex][this.sectionDQuestionIndex];
        if (selected !== null) {
            document.getElementById(`section-d-option${selected}`).checked = true;
        }

        const isFinal = this.sectionDPassageIndex === this.sectionDPassages.length - 1 && this.sectionDQuestionIndex === passage.questions.length - 1;
        document.getElementById('section-d-next').style.display = isFinal ? 'none' : 'inline-block';
        document.getElementById('section-d-finish').style.display = isFinal ? 'inline-block' : 'none';
    }

    playSectionDAudio() {
        if (this.sectionDPlayedPassages[this.sectionDPassageIndex]) {
            return;
        }

        const passageText = this.sectionDPassages[this.sectionDPassageIndex].passage;
        this.sectionDPlayedPassages[this.sectionDPassageIndex] = true;
        document.getElementById('section-d-play').disabled = true;

        const preRoll = new SpeechSynthesisUtterance('warm up start');
        preRoll.volume = 0;
        const utterance = new SpeechSynthesisUtterance(passageText);
        utterance.rate = 0.95;

        const playActual = () => window.speechSynthesis.speak(utterance);
        preRoll.onend = playActual;
        preRoll.onerror = playActual;

        this.stopActiveMedia();
        this.speakingAudioTimer = setTimeout(() => {
            window.speechSynthesis.speak(preRoll);
            this.speakingAudioTimer = null;
        }, this.speakingAudioDelayMs);
    }

    selectSectionDOption(index) {
        this.sectionDAnswers[this.sectionDPassageIndex][this.sectionDQuestionIndex] = index;
    }

    nextSectionD() {
        this.stopActiveMedia();
        const passage = this.sectionDPassages[this.sectionDPassageIndex];

        if (this.sectionDQuestionIndex < passage.questions.length - 1) {
            this.sectionDQuestionIndex++;
        } else if (this.sectionDPassageIndex < this.sectionDPassages.length - 1) {
            this.sectionDPassageIndex++;
            this.sectionDQuestionIndex = 0;
        }

        this.renderSectionD();
    }

    finishSectionD() {
        this.stopActiveMedia();
        let score = 0;
        let total = 0;

        this.sectionDPassages.forEach((passage, pIdx) => {
            passage.questions.forEach((question, qIdx) => {
                total++;
                if (this.sectionDAnswers[pIdx][qIdx] === question.correct) {
                    score++;
                }
            });
        });

        this.stopSectionTimer();
        if (this.fullTestMode) {
            this.fullTestSectionScores.D = { score, total };
            const overall = this.getFullTestOverall();
            this.showSectionResult('Full Test Completed', overall.score, overall.total);
            this.fullTestMode = false;
        } else {
            this.showSectionResult('Section D Completed', score, total);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AssessmentApp();
});

window.addEventListener('beforeunload', (event) => {
    const activeTestScreen = document.querySelector('#section-a-screen.active, #section-b-screen.active, #section-c-screen.active, #section-d-screen.active');
    if (activeTestScreen) {
        event.preventDefault();
        event.returnValue = '';
    }
});
