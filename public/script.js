// script.js

window.addEventListener('DOMContentLoaded', () => {
  // ── 상수 ─────────────────────────────────────
  const INFO_LIMIT    = 2 * 60;     // 개인정보 입력 2분
  const TOTAL_LIMIT   = 82 * 60;    // 전체 82분
  const TYPEA_LIMIT   = 40 * 60;    // Type A 40분
  const PER_Q_SEC     = 10;         // 10초/문항
  const TYPEA_COUNT   = 240;        // 240문항

  // ── 상태 ─────────────────────────────────────
  let infoTimeLeft = INFO_LIMIT, infoInterval;
  let tStart, tInterval;
  let segStart, segInterval;
  let qTimeLeft, qInterval, qTimeout;
  let currentIndex = 0;
  let personalInfo = {}, questions = [], responses = [];

  const MS_MAP = {
    '강남': ['단대부중','역삼중','도곡중','대명중','대청중','숙명여중','휘문중'],
    '서초': ['원촌중','서초중','반포중','세화여중'],
    '송파': ['잠실중','송례중','풍납중'],
    '목동': ['목동중','목일중','신목중','월촌중','양정중','목운중'],
    '중계': ['중계중','상명중','불암중','을지중']
  };

  const LABELS = {
    5: '매우 그렇다',
    4: '약간 그렇다',
    3: '보통',
    2: '약간 아니다',
    1: '매우 아니다'
  };

  // ── DOM ─────────────────────────────────────
  const infoTimerDiv = document.getElementById('info-timer');
  const startBtn     = document.getElementById('start');
  const userForm     = document.getElementById('user-form');
  const surveyDiv    = document.getElementById('survey');
  const resultDiv    = document.getElementById('result');

  const totalTimer   = document.getElementById('total-timer');
  const segmentTimer = document.getElementById('segment-timer');
  const timerDiv     = document.getElementById('timer');
  const progressDiv  = document.getElementById('progress');

  const nameIn       = document.getElementById('name');
  const schoolIn     = document.getElementById('school');
  const genderIn     = document.getElementById('gender');
  const regionIn     = document.getElementById('region');
  const subRegGrp    = document.getElementById('subregion-group');
  const subRegPills  = subRegGrp.querySelectorAll('.pill');
  const msGrp        = document.getElementById('middleschool-group');
  const msSelect     = document.getElementById('middleschool');
  const bPills       = document.querySelectorAll('#bcount-group .pill');
  const tPills       = document.querySelectorAll('#schooltype-group .pill');

  const infoDiv      = document.getElementById('personal-info');
  const qText        = document.getElementById('question-text');
  const answersDiv   = document.getElementById('answers');
  const nextBtn      = document.getElementById('next');
  const downloadLink = document.getElementById('download-link');

  // ── 개인정보 입력 2분 타이머 ─────────────────
  function startInfoTimer() {
    updateInfoTimer();
    infoInterval = setInterval(() => {
      infoTimeLeft--;
      updateInfoTimer();
      if (infoTimeLeft <= 0) {
        clearInterval(infoInterval);
        infoTimerDiv.textContent = '00:00';
      }
    }, 1000);
  }
  function updateInfoTimer() {
    const m = String(Math.floor(infoTimeLeft/60)).padStart(2,'0');
    const s = String(infoTimeLeft%60).padStart(2,'0');
    infoTimerDiv.textContent = `${m}:${s}`;
  }
  startInfoTimer();

  // ── 지역 선택 토글 ───────────────────────────
  regionIn.addEventListener('change', () => {
    if (regionIn.value === '서울 특별시') {
      subRegGrp.classList.remove('hidden');
    } else {
      subRegGrp.classList.add('hidden');
      msGrp.classList.add('hidden');
    }
  });

  // ── 서울 권역 선택 ───────────────────────────
  subRegPills.forEach(p => p.addEventListener('click', () => {
    subRegPills.forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');
    const list = MS_MAP[p.dataset.value] || [];
    msSelect.innerHTML = '';
    list.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      msSelect.appendChild(opt);
    });
    const other = document.createElement('option');
    other.value = '기타'; other.textContent = '기타';
    msSelect.appendChild(other);
    msGrp.classList.remove('hidden');
  }));

  // ── Pill 바인딩 ─────────────────────────────
  function bindPills(list) {
    list.forEach(p => p.addEventListener('click', () => {
      list.forEach(x => x.classList.remove('selected'));
      p.classList.add('selected');
    }));
  }
  bindPills(bPills);
  bindPills(tPills);

  // ── 설문 시작 ─────────────────────────────────
  startBtn.addEventListener('click', () => {
    // 필수 입력 체크
    const name   = nameIn.value.trim();
    const school = schoolIn.value.trim();
    const gender = genderIn.value;
    const region = regionIn.value;
    const subP   = document.querySelector('#subregion-group .pill.selected');
    const bSel   = document.querySelector('#bcount-group .pill.selected');
    const tSel   = document.querySelector('#schooltype-group .pill.selected');
    if (!name || !school || !gender || !region || !bSel || !tSel) {
      return alert('모든 필드를 입력·선택해주세요.');
    }
    let subregion = '기타 지역', middle = '기타', msFlag = 0;
    if (region === '서울 특별시' && subP) {
      subregion = subP.dataset.value;
      middle    = msSelect.value;
      if (middle !== '기타') msFlag = 1;
    }
    personalInfo = {
      name, school, gender,
      region, subregion, middle, msFlag,
      bcount: bSel.dataset.value,
      schooltype: tSel.dataset.value
    };
    infoDiv.textContent = 
      `이름: ${name} | 학교: ${school} | 성별: ${gender} | ` +
      `지역: ${region}/${subregion} | 중학교: ${middle} (flag:${msFlag}) | ` +
      `B등급: ${personalInfo.bcount} | 희망: ${personalInfo.schooltype}`;

    // 엑셀에서 문항 로드
    fetch('최종_학습순환구조_240문항.xlsx')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(buf => {
        const wb    = XLSX.read(new Uint8Array(buf), {type:'array'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const recs  = XLSX.utils.sheet_to_json(sheet);
        const key   = Object.keys(recs[0]).find(k => k.trim()==='문항')
                    || Object.keys(recs[0])[1];
        questions   = recs.map(r => r[key]).filter(q => q).slice(0, TYPEA_COUNT);
        responses   = Array(questions.length).fill(null);
        currentIndex = 0;
        userForm.classList.add('hidden');
        surveyDiv.classList.remove('hidden');
        tStart   = Date.now();
        segStart = Date.now();
        startTotalTimer();
        startSegmentATimer();
        renderQuestion();
      })
      .catch(err => {
        console.error(err);
        alert(`문항 로딩 실패: ${err.message}`);
      });
  });

  // ── 전체 타이머 ───────────────────────────────
  function startTotalTimer() {
    clearInterval(tInterval);
    updateTotalTimer();
    tInterval = setInterval(updateTotalTimer, 1000);
  }
  function updateTotalTimer() {
    const elapsed = Math.floor((Date.now()-tStart)/1000);
    const remain  = TOTAL_LIMIT - elapsed;
    totalTimer.textContent =
      `전체 경과 시간: ${formatTime(elapsed)} | 전체 남은 시간: ${formatTime(remain)}`;
    if (remain <= 0) finishSurvey();
  }

  // ── Type A 세그먼트 타이머 ───────────────────
  function startSegmentATimer() {
    clearInterval(segInterval);
    updateSegmentATimer();
    segInterval = setInterval(updateSegmentATimer, 1000);
  }
  function updateSegmentATimer() {
    const elapsed = Math.floor((Date.now()-segStart)/1000);
    const remain  = TYPEA_LIMIT - elapsed;
    segmentTimer.textContent =
      `Type A 경과 시간: ${formatTime(elapsed)} | 남은 시간: ${formatTime(remain)}`;
    if (remain <= 0) {
      clearInterval(segInterval);
      // TODO: Type B 이어붙이기
    }
  }

  // ── 문항 렌더 & 타이머 ───────────────────────
  function renderQuestion() {
    document.getElementById('prev').style.display = 'none';

    qText.textContent = `${currentIndex+1}. ${questions[currentIndex]}`;
    answersDiv.innerHTML = '';

    Object.entries(LABELS).forEach(([score,label]) => {
      const btn = document.createElement('button');
      btn.textContent    = `${score} ${label}`;
      btn.dataset.score = score;
      if (responses[currentIndex] == +score) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        responses[currentIndex] = +score;
        answersDiv.querySelectorAll('button')
                  .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        nextBtn.disabled = false;
        updateProgress();
      });
      answersDiv.appendChild(btn);
    });

    nextBtn.disabled = (responses[currentIndex] == null);
    updateProgress();

    // per-question 타이머: 반드시 계속 흐름
    clearInterval(qInterval);
    clearTimeout(qTimeout);
    qTimeLeft = PER_Q_SEC; updateQuestionTimer();
    qInterval = setInterval(() => {
      qTimeLeft--;
      updateQuestionTimer();
      if (qTimeLeft <= 0) clearInterval(qInterval);
    }, 1000);

    qTimeout = setTimeout(() => {
      if (responses[currentIndex] == null) {
        responses[currentIndex] = 3;
        updateProgress();
      }
      moveNext();
    }, PER_Q_SEC * 1000);
  }

  function updateQuestionTimer() {
    timerDiv.textContent = `문항 남은 시간: ${qTimeLeft}초`;
  }

  function updateProgress() {
    const left = responses.filter(r => r == null).length;
    progressDiv.textContent =
      `전체 문항: ${questions.length}개 | 미응답: ${left}개`;
  }

  nextBtn.addEventListener('click', () => {
    clearInterval(qInterval);
    clearTimeout(qTimeout);
    moveNext();
  });

  function moveNext() {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      finishSurvey();
    }
  }

  // ── 설문 완료 및 엑셀 생성 ─────────────────────
  function finishSurvey() {
    clearInterval(tInterval);
    clearInterval(segInterval);
    clearInterval(qInterval);
    clearTimeout(qTimeout);
    surveyDiv.classList.add('hidden');
    resultDiv.classList.remove('hidden');

    const wb       = XLSX.utils.book_new();
    const infoRows = [
      ['학생 성명', personalInfo.name],
      ['출신 학교', personalInfo.school],
      ['성별', personalInfo.gender],
      ['거주 지역', personalInfo.region],
      ['서울 권역', personalInfo.subregion],
      ['출신 중학교', personalInfo.middle],
      ['중학교 플래그', personalInfo.msFlag],
      ['B등급 과목 수', personalInfo.bcount],
      ['진학 희망 고교', personalInfo.schooltype],
      []
    ];
    const header   = [['문항 번호','문항','점수','설명']];
    const body     = questions.map((q,i) => [
      i+1, q, responses[i], LABELS[responses[i]] || ''
    ]);
    const ws       = XLSX.utils.aoa_to_sheet(infoRows.concat(header, body));
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    const wbout    = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    const blob     = new Blob([wbout], { type:'application/octet-stream' });
    downloadLink.href = URL.createObjectURL(blob);
  }

  function formatTime(sec) {
    if (sec < 0) sec = 0;
    const m = String(Math.floor(sec / 60)).padStart(2,'0');
    const s = String(sec % 60).padStart(2,'0');
    return `${m}:${s}`;
  }
});