// script.js

window.addEventListener('DOMContentLoaded', () => {
  /* ── 상수 ───────────────────────────────────────── */
  const TOTAL_LIMIT = 90 * 60;   // 전체 제한 시간 90분
  const A_Q_SEC     = 10;        // Type A: 10초/문항
  const B_Q_SEC     = 60;        // Type B: 60초/문항
  const C_Q_SEC     = 240;       // Type C: 240초(4분)/문항

  /* ── 상태 변수 ───────────────────────────────────── */
  let startTime, totalInt, segmentInt;
  let qLeft, qInt, qTO;
  let stage = 'A', idxA = 0, idxB = 0, idxC = 0;
  let questionsA = [], questionsB = [], questionsC = [];
  let respA = [], respB = [], respC = [];


  /* ── DOM 참조 ─────────────────────────────────────── */
  const userForm        = document.getElementById('user-form');
  const surveyDiv       = document.getElementById('survey');
  const resultDiv       = document.getElementById('result');

  const startBtn        = document.getElementById('start');
  const devB            = document.getElementById('dev-b');
  const devC            = document.getElementById('dev-c');

  const nameIn          = document.getElementById('name');
  const schoolIn        = document.getElementById('school');
  const genderIn        = document.getElementById('gender');
  const regionIn        = document.getElementById('region');
  const subRgGrp        = document.getElementById('subregion-group');
  const subPills        = Array.from(document.querySelectorAll('#subregion-group .pill'));
  const msGrp           = document.getElementById('middleschool-group');
  const msSelect        = document.getElementById('middleschool');

  const bPills          = Array.from(document.querySelectorAll('#bcount-group .pill'));
  const tPills          = Array.from(document.querySelectorAll('#schooltype-group .pill'));

  const personalInfoDiv = document.getElementById('personal-info');
  const surveyTitle     = document.querySelector('#survey h2');
  const questionText    = document.getElementById('question-text');
  const totalTimerDiv   = document.getElementById('total-timer');
  const segmentTimerDiv = document.getElementById('segment-timer');
  const timerDiv        = document.getElementById('timer');
  const progressDiv     = document.getElementById('progress');
  const answersDiv      = document.getElementById('answers');
  const hintDiv         = document.getElementById('hint');
  const prevBtn         = document.getElementById('prev');
  const nextBtn         = document.getElementById('next');
  const downloadLink    = document.getElementById('download-link');

  // ── 디버그 버튼 핸들러 (설문 시작 후에만 눌러주세요) ─────────────────────
devB.addEventListener('click', () => {
   // Type A 응답을 모두 “3 (보통)”으로
   respA = respA.map(() => 3);
   // Type A 소요시간(240문항×10초)을 모두 소모했다고 설정
   startTime = Date.now() - questionsA.length * A_Q_SEC * 1000;
   switchToTypeB();
 });

 devC.addEventListener('click', () => {
   // Type A 응답을 모두 “3 (보통)”
   respA = respA.map(() => 3);
   // Type B 설문을 스킵했으니 모두 “A” 로
   respB = respB.map(() => 'A');
   // Type A + Type B 소요시간(240×10초 + 10×60초)을 모두 소모했다고 설정
   startTime = Date.now()
     - (questionsA.length * A_Q_SEC + questionsB.length * B_Q_SEC) * 1000;
   switchToTypeC();
 });


   // 1~6번 입력 완료 시에만 시작 버튼 활성화
  function validatePersonalInfo() {
    const nameOK   = !!nameIn.value.trim();
    const genderOK = !!genderIn.value;
    const regionOK = !!regionIn.value;

    // schoolOK: 서울/기타 지역 구분 없이 schoolIn.value 검사 + 
    // 서울권 분기 시 해당 중학교(msSelect.value)도 체크
    let schoolOK = !!schoolIn.value.trim();
    if (regionIn.value === '서울 특별시') {
      const sel = subPills.find(p => p.classList.contains('selected'));
      if (sel && sel.dataset.value !== '기타 지역') {
        schoolOK = !!msSelect.value;
      }
    }

    // B등급, 고교분류 pill 체크
    const bOK = Array.from(document.querySelectorAll('#bcount-group .pill'))
                     .some(p => p.classList.contains('selected'));
    const tOK = Array.from(document.querySelectorAll('#schooltype-group .pill'))
                     .some(p => p.classList.contains('selected'));

    startBtn.disabled = !(nameOK && genderOK && regionOK && schoolOK && bOK && tOK);
  }

  // 입력 필드나 pill 클릭 시마다 재검증
  // 입력값 변화 & pill 클릭 시 모두 재검증
[nameIn, schoolIn, genderIn, regionIn, msSelect].forEach(el =>
  el.addEventListener('input', validatePersonalInfo)
);
subPills.forEach(p => p.addEventListener('click', validatePersonalInfo));
bPills.forEach(p    => p.addEventListener('click', validatePersonalInfo));
tPills.forEach(p    => p.addEventListener('click', validatePersonalInfo));


  const schoolMap = {
      '강남': ['단대부중', '역삼중', '도곡중', '대명중', '대청중', '숙명여중', '휘문중'],
      '서초': ['원촌중','서초중','반포중', '세화여중'],
      '송파': ['잠실중','송례중','풍납중'],
      '목동': ['목동중','목일중','신목중', '월촌중', '양정중', '목운중'],
      '중계': ['중계중','상명중','불암중', '을지중']
  };

  /* ── 1) 서울→중학교 토글, Pill 설정 ───────────────── */
  // 1) 서울 ↔ 중학교 토글
  regionIn.addEventListener('change', () => {
  if (regionIn.value === '서울 특별시') {
    subregionGroup.classList.remove('hidden');
    middleschoolGroup.classList.add('hidden');
    schoolIn.classList.add('hidden');
    middleschool.innerHTML = '<option value="" disabled selected>중학교 선택</option>';
  } else {
    subregionGroup.classList.add('hidden');
    middleschoolGroup.classList.add('hidden');
    middleschool.innerHTML = '<option value="" disabled selected>중학교 선택</option>';
    schoolIn.classList.remove('hidden');
  }
  validatePersonalInfo();
});


  subPills.forEach(p => p.addEventListener('click', () => {
    subPills.forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');

    const v = p.dataset.value;
    msSelect.innerHTML = '<option value="" disabled selected>중학교 선택</option>';

    if (v === '기타 지역') {
      msGrp.classList.add('hidden');
    } else {
      msGrp.classList.remove('hidden');
      schoolMap[v].forEach(sch => {
        const o = document.createElement('option');
        o.value = sch; o.textContent = sch;
        msSelect.appendChild(o);
      });
      const oOther = document.createElement('option');
      oOther.value = '기타'; oOther.textContent = '기타';
      msSelect.appendChild(oOther);
    }
    validatePersonalInfo();
  }));

  function setupPills(pills){
    pills.forEach(p => p.addEventListener('click', () => {
      pills.forEach(x => x.classList.remove('selected'));
      p.classList.add('selected');
    }));
  }
  setupPills(bPills);
  setupPills(tPills);

  /* ── 2) ‘설문 시작’ 클릭 핸들러 ───────────────────── */
  startBtn.addEventListener('click', () => {
    // ── 수정된 유효성 검사 ──
    const nameOK   = !!nameIn.value.trim();
    const genderOK = !!genderIn.value;
    const regionOK = !!regionIn.value;

    let schoolOK = false;
    if (regionIn.value === '서울 특별시') {
      // 4-1 선택된 권역
      const sel = subPills.find(p => p.classList.contains('selected'));
      if (sel) {
        if (sel.dataset.value === '기타 지역') {
          schoolOK = !!schoolIn.value.trim();
        } else {
          schoolOK = !!msSelect.value;
        }
      }
    } else {
      schoolOK = !!schoolIn.value.trim();
    }

    const bOK = bPills.some(p => p.classList.contains('selected'));
    const tOK = tPills.some(p => p.classList.contains('selected'));

    if (!(nameOK && genderOK && regionOK && schoolOK && bOK && tOK)) {
      return alert('1~6번 정보를 모두 입력/선택해주세요.');
    }

    // 학생 정보 표시
    const sub = subPills.find(x=>x.classList.contains('selected'))?.dataset.value||'';
    const msVal = msSelect.value || '';

    // 1) 선택된 권역(구) 찾기
    const selPill = Array.from(subPills)
    .find(x => x.classList.contains('selected'));
    
    const district = selPill?.dataset.value;
    
    // 2) 중학교 필드 결정
    let middleSchoolValue = '';
    if (regionIn.value === '서울 특별시' && district && district !== '기타 지역') {
      middleSchoolValue = middleschool.value || '';
    } else {
      middleSchoolValue = schoolIn.value.trim();
    }
    
    // 3) 요약문 갱신
    personalInfoDiv.textContent =
    `이름: ${nameIn.value.trim()} | 출신학교: ${schoolIn.value.trim()} | 성별: ${genderIn.value} | 거주: ${regionIn.value}${district?'/'+district:''} | 중학교: ${middleSchoolValue} | B등급: ${bPills.find(x=>x.classList.contains('selected')).dataset.value} | 희망고교: ${tPills.find(x=>x.classList.contains('selected')).dataset.value}`;

    // 엑셀 로드
    fetch('Questions.xlsx')
      .then(r=>r.arrayBuffer())
      .then(buf=>{
        const wb = XLSX.read(new Uint8Array(buf), {type:'array'});
        questionsA = XLSX.utils.sheet_to_json(wb.Sheets['Type A'])
          .map(r=>({no:r['연번'],q:r['문항'],p:r['지문'],A:r['(A)'],B:r['(B)'],C:r['(C)'],D:r['(D)']}));
        questionsB = XLSX.utils.sheet_to_json(wb.Sheets['Type B'])
          .map(r=>({no:r['연번'],q:r['문항'],p:r['지문'],A:r['(A)'],B:r['(B)'],C:r['(C)'],D:r['(D)']}));
        questionsC = XLSX.utils.sheet_to_json(wb.Sheets['Type C'])
          .map(r=>({no:r['연번'],q:r['문항'],p:r['지문'],A:r['(A)'],B:r['(B)'],C:r['(C)'],D:r['(D)']}));
        respA = Array(questionsA.length).fill(null);
        respB = Array(questionsB.length).fill(null);
        respC = Array(questionsC.length).fill(null);
        idxA = idxB = idxC = 0;
        userForm.classList.add('hidden');
        surveyDiv.classList.remove('hidden');
        stage = 'A';
        startTime = Date.now();
        startTotalTimer();
        startSegmentATimer();
        renderQuestionA();
      })
      .catch(e=>{
        console.error(e);
        alert('문항 로딩 실패');
      });
  });

  /* ── 3) 전체 타이머 ─────────────────────────────── */
  function startTotalTimer(){
    clearInterval(totalInt);
    updateTotalTimer();
    totalInt = setInterval(updateTotalTimer, 1000);
  }
  function updateTotalTimer(){
    const elapsed = Math.floor((Date.now()-startTime)/1000);
    const remain  = TOTAL_LIMIT - elapsed;
    totalTimerDiv.textContent = `⏱ 전체 경과 시간: ${fmt(elapsed)} | ⏱ 남은 시간: ${fmt(remain)}`;
    if (remain <= 0) finishSurvey();
  }

  /* ── 4) A 세그먼트 타이머 ───────────────────────── */
  function startSegmentATimer(){
    clearInterval(segmentInt);
    updateSegmentATimer();
    segmentInt = setInterval(updateSegmentATimer,1000);
  }
  function updateSegmentATimer(){
    const usedA = idxA*A_Q_SEC + (A_Q_SEC - (qLeft||0));
    const remainA = questionsA.length*A_Q_SEC - usedA;
    segmentTimerDiv.textContent = `⏱ Type A 남은시간: ${fmt(remainA)}`;
    if (remainA <= 0) switchToTypeB();
  }

  /* ── 5) 질문별 타이머 헬퍼 ─────────────────────── */
  function startQuestionTimer(sec, onEnd){
    clearQuestionTimer();
    qLeft = sec; timerDiv.textContent = `⏱ 남은 문항 시간: ${qLeft}초`;
    qInt = setInterval(()=>{
      qLeft--; timerDiv.textContent = `⏱ 남은 문항 시간: ${qLeft}초`;
      if (qLeft<=0) clearInterval(qInt);
    },1000);
    qTO = setTimeout(onEnd, sec*1000);
  }
  function clearQuestionTimer(){
    clearInterval(qInt);
    clearTimeout(qTO);
  }

  /* ── 6) Type A 렌더 & 이동 ─────────────────────── */
  // 상단 어딘가에 매핑 객체 추가
const A_LABELS = {
  5: '매우 그렇다',
  4: '약간 그렇다',
  3: '보통',
  2: '약간 아니다',
  1: '전혀 아니다'
};

function renderQuestionA() {
  clearQuestionTimer();
  const cur = questionsA[idxA];
  surveyTitle.textContent = `Type A (${idxA+1}/${questionsA.length})`;
  questionText.innerHTML = `
    <strong>${cur.no}. ${cur.q}</strong>
    <div style="margin-top:8px;">${cur.p||''}</div>
  `;

  // 버튼 생성 부분
  answersDiv.innerHTML = '';
  [5,4,3,2,1].forEach(score => {
    const btn = document.createElement('button');
    btn.textContent = `${score} (${A_LABELS[score]})`;
    // 선택된 값 유지
    if (respA[idxA] === score) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      respA[idxA] = score;
      answersDiv.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
      nextBtn.disabled = false;
    });
    answersDiv.appendChild(btn);
  });

  nextBtn.disabled = (respA[idxA] == null);
  nextBtn.onclick = () => moveA();

  startQuestionTimer(A_Q_SEC, () => {
    if (!respA[idxA]) respA[idxA] = 3;  // 기본값
    moveA();
  });
  progressDiv.textContent = `${idxA+1}/${questionsA.length}`;
}

  function moveA(){
    clearQuestionTimer();
    if(idxA<questionsA.length-1){idxA++; renderQuestionA();}
    else switchToTypeB();
  }

  /* ── 7) A→B 전환 ─────────────────────────────── */
  function switchToTypeB(){
    stage='B'; idxB=0;
    clearInterval(segmentInt);
    segmentTimerDiv.textContent = 'Type B 진행 중';
    renderQuestionB();
  }

  /* ── 8) Type B 렌더 & 이동 ───────────────────── */
  function renderQuestionB(){
    clearQuestionTimer();
    const cur = questionsB[idxB];
    surveyTitle.textContent = `Type B (${idxB+1}/${questionsB.length})`;
    questionText.innerHTML = `<strong>${cur.no}. ${cur.q}</strong><div style="margin-top:8px;">${cur.p}</div>`;
    answersDiv.innerHTML = '';

    let html = '';

  // 4~7번: 지문 → 문항
  if (cur.no >= 4 && cur.no <= 7) {
    const p4_7 = 'Q4~Q7. 다음 글을 읽고, 각 빈칸에 들어갈 표현을 고르세요.'
    html += `<div style="margin-top:8px;">${p4_7}</div>`;
    html += `<div style="margin-top:8px;">${cur.p}</div>`;
    html += `<div style="margin-top:8px;"><strong>${cur.no}. ${cur.q}</strong></div>`;
  }
  // 8·9번: 지문8 + Table_I.jpg + 지문9 → 문항
  else if (cur.no === 8 || cur.no === 9) {
    // 연번 8의 지문
    const p8 = questionsB.find(q => q.no === 8).p;
    const p8_1 = 'Martial Arts Club of Fort Dodge'
    // 연번 9의 지문
    const p9 = questionsB.find(q => q.no === 9).p;
    

    html += `<div style="margin-top:8px;">${p8}</div>`;
    html += `<div style="margin-top:8px; text-align: center;"><strong>${p8_1}</strong></div>`;
    html += `<img src="Table_I.jpg" style="max-width:100%; display:block; margin:8px 0;">`;
    html += `<div style="margin-top:8px;">${p9}</div>`;
    html += `<div style="margin-top:8px;"><strong>${cur.no}. ${cur.q}</strong></div>`;
  }
  // 그 외(1~3, 10번 등): 원래대로
  else {
    html += `<strong>${cur.no}. ${cur.q}</strong>`;
    html += `<div style="margin-top:8px;">${cur.p}</div>`;
  }

  questionText.innerHTML = html;
    
    ['A','B','C','D'].forEach(opt=>{
      const btn = document.createElement('button');
      btn.textContent = `(${opt}) ${cur[opt]}`;

      if (respB[idxB]===opt) btn.classList.add('selected');
      btn.addEventListener('click', ()=>{
        respB[idxB]=opt;
        answersDiv.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));
        btn.classList.add('selected');
        nextBtn.disabled=false;
      });
      answersDiv.appendChild(btn);
    });
    nextBtn.disabled = !respB[idxB];
    nextBtn.onclick  = ()=>moveB();
    startQuestionTimer(B_Q_SEC, ()=>{
      if(!respB[idxB]) respB[idxB]='X';
      moveB();
    });
    progressDiv.textContent = `${idxB+1}/${questionsB.length}`;
  }
  function moveB(){
    clearQuestionTimer();
    if(idxB<questionsB.length-1){ idxB++; renderQuestionB(); }
    else finishTypeBPhase();
  }
  function finishTypeBPhase(){
    clearQuestionTimer();
    switchToTypeC();
  }

  /* ── 9) B→C 전환 ─────────────────────────────── */
  // 전역 변수: Type C 페이지 인덱스 (0–5: Q1–Q6, 6: Q7–Q10 묶음)
  let typeCPage = 0;


  /* ── 7) A→B 전환 ─────────────────────────────── */

// Type C 시작 시 호출
 function switchToTypeC() {
  typeCPage = 0;
  // Type C 세그먼트 타이머 시작
  startSegmentCTimer();
  respC = new Array(questionsC.length).fill(null);
  renderQuestionC();
 }

// ── Type C 세그먼트 타이머 ─────────────────────────
function startSegmentCTimer() {
  clearInterval(segmentInt);
  updateSegmentCTimer();
  segmentInt = setInterval(updateSegmentCTimer, 1000);
}
function updateSegmentCTimer() {
  // 이미 사용된 시간 = (페이지 인덱스 × 1문항 시간) + (남은 qLeft 보정)
  const used = typeCPage * C_Q_SEC + ((C_Q_SEC) - (qLeft || 0));
  const total = questionsC.length * C_Q_SEC;
  const remain = total - used;
  segmentTimerDiv.textContent = `⏱ Type C 남은시간: ${fmt(remain)}`;
  if (remain <= 0) finishSurvey();
}


  /* ── 10) Type C 렌더 & 이동 ──────────────────── */
  // Type C 렌더링 (Q1–Q6 개별, Q7–Q10 묶음)
function renderQuestionC() {
  clearQuestionTimer();
  answersDiv.innerHTML = '';  // 🔹 Type B 지문 잔류 제거

  // --- 1~6번: 각각 한 페이지 ---
  if (typeCPage < 6) {
    const q = questionsC[typeCPage];
    surveyTitle.textContent = `Type C (문항 ${q.no}/10)`;

    progressDiv.textContent = `${typeCPage+1}/${questionsC.length}`;

    questionText.innerHTML = `
      <div>
        <img src="Q${q.no}.jpg" style="max-width:100%; margin-bottom:16px;">
      </div>`;

    // 보기 버튼 (Type B 스타일)
    ['A', 'B', 'C', 'D'].forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = `(${opt}) ${q[opt] || ''}`;
      btn.classList.add('c-option');
      if (respC[q.no - 1] === opt) btn.classList.add('selected');

      btn.addEventListener('click', () => {
        respC[q.no - 1] = opt;
        document.querySelectorAll('.c-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        nextBtn.disabled = false;
      });

      answersDiv.appendChild(btn);
    });

    nextBtn.style.display = 'inline-block';
    nextBtn.textContent = '다음 ▶';
    prevBtn.style.display = 'none';
    nextBtn.disabled = !respC[q.no - 1];

    nextBtn.onclick = () => {
      clearQuestionTimer();
      if (!respC[q.no - 1]) respC[q.no - 1] = 'X';
      typeCPage++;
      renderQuestionC();
    };

    startQuestionTimer(C_Q_SEC, () => {
      if (!respC[q.no - 1]) respC[q.no - 1] = 'X';
      typeCPage++;
      renderQuestionC();
    });

  // --- 7~10번 묶음 ---
  } else {
    surveyTitle.textContent = 'Type C (문항 7–10)';
    let html = `
      <div style="margin-bottom:16px;">
        <img src="P1.jpg" style="max-width:100%; margin-bottom:8px;">
        <img src="P2.jpg" style="max-width:100%;">
      </div>
    `;

    questionsC
      .filter(q => q.no >= 7 && q.no <= 10)
      .forEach(q => {
        html += `
          <div style="margin-top:16px;">
            <img src="Q${q.no}.jpg" style="max-width:100%; margin-bottom:8px;">
            <div class="answers" style="margin-top:8px;">
              ${['A', 'B', 'C', 'D'].map(opt => `
                <button class="c-opt" data-no="${q.no}" data-value="${opt}">
                  (${opt}) ${q[opt] || ''}
                </button>
              `).join('')}
            </div>
          </div>
        `;
      });

    html += `<div style="text-align: center; margin-top: 20px;">
    <button id="finishSurveyBtn" style="width: 600px;">
    <strong>설문 완료</strong>
    </button>
    </div>`;
    
    questionText.innerHTML = html;
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';

    // 보기 선택 처리
    document.querySelectorAll('.c-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const no = parseInt(btn.dataset.no);
        const val = btn.dataset.value;
        respC[no - 1] = val;

        // 동일 문항 내 다른 버튼 해제
        document.querySelectorAll(`.c-opt[data-no="${no}"]`)
          .forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    document.getElementById('finishSurveyBtn').onclick = () => {
      clearQuestionTimer();
      for (let i = 6; i <= 9; i++) {
        if (!respC[i]) respC[i] = 'X';
      }
      finishSurvey();
    };

    startQuestionTimer(C_Q_SEC * 4, () => {
      for (let i = 6; i <= 9; i++) {
        if (!respC[i]) respC[i] = 'X';
      }
      finishSurvey();
    });
  }
}

  function moveC(){
    clearQuestionTimer();
    if(idxC<questionsC.length-1){ idxC++; renderQuestionC(); }
    else finishSurvey();
  }

  /* ── 11) 최종 결과 & 다운로드 ─────────────────── */
// Global survey database loaded from localStorage
// Load question definitions from Questions.xlsx at startup

  function loadQuestions() {
  return fetch('Questions.xlsx')
    .then(res => res.arrayBuffer())
    .then(ab => {
      const wb = XLSX.read(ab, { type: 'array' });

      // Type A: 연번, 척도(대분류), 문항
      questionsA = XLSX.utils.sheet_to_json(wb.Sheets['Type A'], { defval: '' })
        .map(r => ({
          no:       r['연번'],
          category: r['척도(대분류)'],
          text:     r['문항']
        }));

      // Type B: 연번, 문항, 답, 선택지(A~D)
      questionsB = XLSX.utils.sheet_to_json(wb.Sheets['Type B'], { defval: '' })
        .map(r => ({
          no:      r['연번'],
          question:r['문항'],
          correct: r['답'],
          opts:    { A:r['(A)'], B:r['(B)'], C:r['(C)'], D:r['(D)'] }
        }));

      // Type C: B와 동일 포맷
      questionsC = XLSX.utils.sheet_to_json(wb.Sheets['Type C'], { defval: '' })
        .map(r => ({
          no:      r['연번'],
          question:r['문항'],
          correct: r['답'],
          opts:    { A:r['(A)'], B:r['(B)'], C:r['(C)'], D:r['(D)'] }
        }));

      // 응답 배열 초기화: 질문 개수에 맞게 null 채우기
      respA = Array(questionsA.length).fill(null);
      respB = Array(questionsB.length).fill(null);
      respC = Array(questionsC.length).fill(null);
    });
}

// Initialize survey after questions are loaded
document.addEventListener('DOMContentLoaded', () => {
  loadQuestions().then(() => startSurvey());
});

// Global survey database loaded from localStorage
// 3) 전역 DB 로딩
const STORAGE_KEY = 'surveyDB';
let surveyDB = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

// Main finishSurvey function
function finishSurvey() {
  // A) UI 전환 & 타이머 정리
  clearQuestionTimer();
  clearInterval(totalInt);
  surveyDiv.classList.add('hidden');
  resultDiv.classList.remove('hidden');

  // B) 개인 정보 수집
  const nameVal    = nameIn.value || 'N/A';
  const genderMap  = { '남자':0, '여자':1 };
  const genderCode = genderMap[genderIn.value] ?? 2;
  const regionOpts = Array.from(regionIn.options).filter(o=>o.value);
  const sortedRegions = regionOpts.map(o=>o.text).sort((a,b)=>a.localeCompare(b,'ko'));
  const regionCode = sortedRegions.indexOf(regionIn.selectedOptions[0].text);
  let districtCode=-1, specialSchool=0;
  if(regionIn.value==='서울 특별시') {
    districtCode = subPills.findIndex(p=>p.classList.contains('selected'));
    // TODO: 특수학교 판단 로직
  }
  const schoolVal = schoolIn.value || 'N/A';
  const bCount    = bPills.findIndex(p=>p.classList.contains('selected'));
  const tChoice   = tPills.findIndex(p=>p.classList.contains('selected'));

  // C) Type A 처리: 데이터+평균
  const dataA = questionsA.map((q,i)=>({
    연번:   q.no,
    '척도(대분류)': q.category,
    응답:   respA[i]
  }));
  const categories = [...new Set(questionsA.map(q=>q.category))];
  const averages = categories.map(cat=>{
    const vals = questionsA
      .map((q,i)=> q.category===cat ? respA[i] : null)
      .filter(v=>v!=null);
    return {
      '척도(대분류)': cat,
      평균:          vals.length ? vals.reduce((s,x)=>s+x,0)/vals.length : 0
    };
  });

  // D) Type B 처리: 정답비교+총점
  const dataB = questionsB.map((q,i)=>({
    연번: q.no,
    응답: respB[i],
    정답: q.correct,
    정오: respB[i]===q.correct ? 'O' : 'X'
  }));
  const totalB = dataB.reduce((s,row)=>s + (row.정오==='O'?5:0),0);

  // E) Type C 처리: B와 동일
  const dataC = questionsC.map((q,i)=>({
    연번: q.no,
    응답: respC[i],
    정답: q.correct,
    정오: respC[i]===q.correct ? 'O' : 'X'
  }));
  const totalC = dataC.reduce((s,row)=>s + (row.정오==='O'?5:0),0);

  // F) DB 누적
  const nextId = 'STU'+String(surveyDB.length+1).padStart(4,'0');
  const now    = new Date();
  const completeAt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} `+
                     `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const row = {
    학생ID: nextId,
    학생성명: nameVal,
    출신학교: schoolVal,
    성별: genderCode,
    거주지역: regionCode,
    서울거주구: districtCode,
    특수학교: specialSchool,
    B등급과목수: bCount,
    진학희망고교: tChoice,
    자기조절능력평균: averages.find(a=>a['척도(대분류)']==='자기조절능력')?.평균||0,
    비교과수행능력평균: averages.find(a=>a['척도(대분류)']==='비교과수행능력')?.평균||0,
    내면학업수행능력평균: averages.find(a=>a['척도(대분류)']==='내면학업수행능력')?.평균||0,
    언어정보처리능력평균: averages.find(a=>a['척도(대분류)']==='언어정보처리능력')?.평균||0,
    공학적사고력평균: averages.find(a=>a['척도(대분류)']==='공학적사고력')?.평균||0,
    의약학적성평균: averages.find(a=>a['척도(대분류)']==='의약학적성')?.평균||0,
    TypeB총점: totalB,
    TypeC총점: totalC,
    설문완료일시: completeAt
  };
  surveyDB.push(row);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(surveyDB));

  // G) 워크북 생성 & 시트 추가
  const wb = XLSX.utils.book_new();

  // -- Type A 시트
  const wsA = XLSX.utils.json_to_sheet(dataA, { header:['연번','척도(대분류)','응답'] });
  XLSX.utils.sheet_add_json(wsA, averages, {
    origin: dataA.length+1,
    header:['척도(대분류)','평균']
  });
  XLSX.utils.book_append_sheet(wb, wsA, 'Type A');

  // -- Type B 시트
  const wsB = XLSX.utils.json_to_sheet(dataB, { header:['연번','응답','정답','정오'] });
  XLSX.utils.sheet_add_aoa(wsB, [['총점', totalB]], { origin:-1 });
  XLSX.utils.book_append_sheet(wb, wsB, 'Type B');

  // -- Type C 시트
  const wsC = XLSX.utils.json_to_sheet(dataC, { header:['연번','응답','정답','정오'] });
  XLSX.utils.sheet_add_aoa(wsC, [['총점', totalC]], { origin:-1 });
  XLSX.utils.book_append_sheet(wb, wsC, 'Type C');

  // -- DB 시트
  const wsDB = XLSX.utils.json_to_sheet(surveyDB);
  XLSX.utils.book_append_sheet(wb, wsDB, 'DB');

  // -- Recent 시트
  const wsRecent = XLSX.utils.json_to_sheet([row]);
  XLSX.utils.book_append_sheet(wb, wsRecent, 'Recent');

  // H) Blob 방식 다운로드
  const binStr = XLSX.write(wb, { bookType:'xlsx', type:'binary' });
  const buf    = new Uint8Array(binStr.length);
  for (let i=0; i<binStr.length; ++i) buf[i] = binStr.charCodeAt(i);
  const blob   = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const dl     = document.getElementById('download-link');
  dl.href      = url;
  dl.download  = 'survey_result.xlsx';
}

  /* ── 헬퍼 ───────────────────────────────────── */
  function pad(n){ return n.toString().padStart(2,'0'); }
  function fmt(s){ return pad(Math.floor(s/60))+':'+pad(s%60); }
});


function setDownloadLinks(wb) {
  try {
    // 1) 중복 시트 제거
    const seen = new Set();
    wb.SheetNames = wb.SheetNames.filter(name => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    // 2) 바이너리 배열로 변환
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const buf = new Uint8Array(out).buffer;

    // 3) Blob 하나만 생성
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url  = URL.createObjectURL(blob);

    // 4) DOM에서 링크 요소 다시 조회
    const nameInput    = document.getElementById('name');
    const userName     = nameInput?.value.trim() || 'anonymous';
    const downloadLink = document.getElementById('download-link');
    const dbLink       = document.getElementById('db-download-link');

    // 5) 두 링크에 Blob URL 할당, 파일명만 다르게
    if (downloadLink) {
      downloadLink.href     = url;
      downloadLink.download = `survey_result_${userName}.xlsx`;
    }
    if (dbLink) {
      dbLink.href     = url;
      dbLink.download = `survey_database_${userName}.xlsx`;
    }
  } catch (err) {
    console.error('다운로드 링크 설정 중 오류:', err);
    alert('엑셀 파일 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
  }
}