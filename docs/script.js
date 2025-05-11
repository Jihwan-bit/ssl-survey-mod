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

// Type C 시작 시 호출
function switchToTypeC() {
  typeCPage = 0;
  respC = new Array(10);         // 응답 배열 초기화
  renderQuestionC();
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

    html += `<button id="finishSurveyBtn" style="margin-top:20px;">설문 완료</button>`;
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
  function finishSurvey(){
    clearQuestionTimer();
    clearInterval(totalInt);
    surveyDiv.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    const wb = XLSX.utils.book_new();

    // ── Type A 시트 ──
wb.SheetNames.push('Type A');
const typeAData = questionsA.map((q,i) => ({
  연번:     q.no,
  척도:     q.scale,
  문항:     q.q,
  응답:     respA[i],
  점수:     respA[i] * 5        // 5점 척도로 환산
}));
wb.Sheets['Type A'] = XLSX.utils.json_to_sheet(typeAData);

// ── 척도별 합계·평균 행 추가 ──
const scales = [...new Set(typeAData.map(r => r.척도))];
const summary = scales.map(scaleName => {
  const items = typeAData.filter(r => r.척도 === scaleName);
  const total = items.reduce((s,r) => s + r.점수, 0);
  const avg   = items.length ? total / items.length : 0;
  return {
    척도: scaleName,
    총점: total,
    평균: avg.toFixed(2)
  };
});
// 워크시트 맨 아래에 요약 추가
XLSX.utils.sheet_add_json(
  wb.Sheets['Type A'],
  summary,
  { origin: -1, skipHeader: true }
);

// ── Type B 시트 ──
wb.SheetNames.push('Type B');
const typeBData = questionsB.map((q,i) => {
  const userAns = respB[i];
  const correct = q.a;
  const ok      = userAns === correct ? 'O' : 'X';
  return {
    연번:   q.no,
    문항:   q.q,
    정답:   correct,
    응답:   userAns,
    정오:   ok,
    점수:   ok === 'O' ? 5 : 0
  };
});
wb.Sheets['Type B'] = XLSX.utils.json_to_sheet(typeBData);

// ── Type C 시트 ──
wb.SheetNames.push('Type C');
const typeCData = questionsC.map((q,i) => {
  const userAns = respC[i];
  const correct = q.a;
  const ok      = userAns === correct ? 'O' : 'X';
  return {
    연번:   q.no,
    문항:   q.q,
    정답:   correct,
    응답:   userAns,
    정오:   ok,
    점수:   ok === 'O' ? 5 : 0
  };
});
wb.Sheets['Type C'] = XLSX.utils.json_to_sheet(typeCData);


    // (추가) 시트 “Personal Info” 생성
  wb.SheetNames.push('Personal Info');
  // 1) 옵션들에서 placeholder(빈값) 제외
  // 2) 실제 선택된 인덱스 찾기 (0부터 시작)
  // 3) 서울일 때만 subregion·middleschool, 아니면 N/A
  const subVal = (regionIn.value==='서울 특별시' && subIdx>=0)
                   ? subPills[subIdx].dataset.value
                   : 'N/A';
  const msIdx = (regionIn.value==='서울 특별시' && msSelect.selectedIndex>0)
                   ? msSelect.selectedIndex-1
                   : 'N/A';
  const msVal = (regionIn.value==='서울 특별시' && msSelect.value)
                   ? msSelect.value
                   : 'N/A';
  // 4) B등급 과목 수, 희망 고교 분류
  const bVal = bIdx>=0 ? bPills[bIdx].dataset.value : 'N/A';
  const tVal = tIdx>=0 ? tPills[tIdx].dataset.value : 'N/A';

  wb.Sheets['Personal Info'] = XLSX.utils.json_to_sheet([{
    이름:               nameIn.value,
    성별:               genderIn.value,             성별_index:            genderIdx,
    거주지역:           regionIn.value,             거주지역_index:        regionIdx,
    세부권역:           subVal,                     세부권역_index:        subIdx>=0?subIdx:'N/A',
    출신중학교:         msVal,                      출신중학교_index:      msIdx,
    B등급과목수:       bVal,                       B등급과목수_index:     bIdx,
    희망고교분류:       tVal,                       희망고교분류_index:     tIdx
  }]);

  // ── 이후 기존 워크북 쓰기 로직 ──

   // ─── 0) 로컬 DB 및 카운터 불러오기 ───
  const dbRecords = JSON.parse(localStorage.getItem('surveyDB') || '[]');
  const stuCount = parseInt(localStorage.getItem('stuCount') || '1', 10);
  const stuID    = 'STU' + String(stuCount).padStart(4, '0');
  // 다음 설문을 위해 카운터 증가 저장
  localStorage.setItem('stuCount', String(stuCount + 1));

  // ─── 1) 인덱스 값 계산 (이전 예시에서 쓰던 방법 그대로) ───
  // (1) 이름·학교
  const nameVal   = nameIn.value;
  const schoolVal = schoolIn.value;

  // (2) 성별
  const genderOpts = Array.from(genderIn.options).filter(o=>o.value);
  const genderIdx  = genderOpts.findIndex(o=>o.value === genderIn.value);

  // (3) 거주지역
  const regionOpts = Array.from(regionIn.options).filter(o=>o.value);
  const regionIdx  = regionOpts.findIndex(o=>o.value === regionIn.value);

  // (4) 서울 구
  let subIdx = -1;
  if(regionIn.value === '서울 특별시'){
    subIdx = subPills.findIndex(p=>p.classList.contains('selected'));
  }
  const seoulDistrictIdx = subIdx < 0 ? 0 : subIdx + 1;

  // (5) 특수학교 여부
  const specialSchoolIdx = 
    regionIn.value === '서울 특별시' &&
    seoulDistrictIdx !== 0 &&
    schoolIn.value !== '기타'
      ? 1 : 0;

  // (6) B등급 과목수
  const bIdx = bPills.findIndex(p=>p.classList.contains('selected'));

  // (7) 희망 고교 분류
  const tIdx = tPills.findIndex(p=>p.classList.contains('selected'));

  // ─── 2) Type A 척도별 평균 계산 (이전 요약 summary 배열 재활용) ───
  // summary 는 [{척도, 총점, 평균}, …] 의 형태라고 가정
  const getAvg = name => {
    const hit = summary.find(s=>s.scaleName===name);
    return hit ? Number(hit.avg.toFixed(2)) : 0;
  };

  const selfRegAvg    = getAvg('자기조절능력');
  const nonClassAvg   = getAvg('비교과 수행능력');
  const innerLearnAvg = getAvg('내면 학업수행능력');
  const langProcAvg   = getAvg('언어정보처리능력');
  const engThinkAvg   = getAvg('공학적 사고력');
  const medSuitAvg    = getAvg('의약학적성');

  // ─── 3) Type B·C 총점 계산 ───
  const typeBTotal = typeBData.reduce((s,r)=> s + r.점수, 0);
  const typeCTotal = typeCData.reduce((s,r)=> s + r.점수, 0);

  // ─── 4) 타임스탬프 ───
  const timestamp = new Date().toISOString();

  // ─── 5) 한 행(record) 생성 & 로컬 DB에 푸시 ───
  const record = {
    학생ID:              stuID,
    학생성명:            nameVal,
    출신학교:            schoolVal,
    성별:                genderIdx,
    거주지역:            regionIdx,
    서울거주구:          seoulDistrictIdx,
    특수학교:            specialSchoolIdx,
    B등급과목수:        bIdx,
    진학희망고교:        tIdx,
    자기조절능력평균:    selfRegAvg,
    비교과수행능력평균:  nonClassAvg,
    내면학업수행능력평균:innerLearnAvg,
    언어정보처리능력평균:langProcAvg,
    공학적사고력평균:    engThinkAvg,
    의약학적성평균:      medSuitAvg,
    TypeB총점:          typeBTotal,
    TypeC총점:          typeCTotal,
    설문완료일시:        timestamp
  };
  dbRecords.push(record);
  localStorage.setItem('surveyDB', JSON.stringify(dbRecords));

  // ─── 6) 엑셀 워크북에 DB 시트 추가 ───
  wb.SheetNames.unshift('DB');  // 맨 앞에 붙이려면
  wb.Sheets['DB'] = XLSX.utils.json_to_sheet(
    dbRecords,
    { header: [
      '학생ID','학생성명','출신학교','성별','거주지역','서울거주구','특수학교',
      'B등급과목수','진학희망고교',
      '자기조절능력평균','비교과수행능력평균','내면학업수행능력평균',
      '언어정보처리능력평균','공학적사고력평균','의약학적성평균',
      'TypeB총점','TypeC총점','설문완료일시'
    ]}
  );

  // ─── 7) 나머지 시트(개인정보, Type A/B/C) 생성 로직은 그대로 두고… ───

  // ─── 최종 엑셀 파일 생성 & 다운로드 링크 세팅 ───
  createPersonalExcel(wb);
  createDatabaseExcel();

}

  /* ── 헬퍼 ───────────────────────────────────── */
  function pad(n){ return n.toString().padStart(2,'0'); }
  function fmt(s){ return pad(Math.floor(s/60))+':'+pad(s%60); }
});


function createPersonalExcel(wb) {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const downloadLink = document.getElementById('download-link');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `survey_responses_${nameIn.value.trim()}.xlsx`;
}


function createDatabaseExcel() {
  const dbRecords = JSON.parse(localStorage.getItem('surveyDB') || '[]');
  const wb = XLSX.utils.book_new();

  // DB 시트 작성
  wb.SheetNames.push('DB');
  wb.Sheets['DB'] = XLSX.utils.json_to_sheet(dbRecords, {
    header: [
      '학생ID','학생성명','출신학교','성별','거주지역','서울거주구','특수학교',
      'B등급과목수','진학희망고교',
      '자기조절능력평균','비교과수행능력평균','내면학업수행능력평균',
      '언어정보처리능력평균','공학적사고력평균','의약학적성평균',
      'TypeB총점','TypeC총점','설문완료일시'
    ]
  });

  // 엑셀 파일 작성
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // HTML 상에 있는 #db-download-link에 연결
  const dbLink = document.getElementById('db-download-link');
  if (dbLink) {
    dbLink.href = URL.createObjectURL(blob);
    dbLink.download = 'survey_database.xlsx';
  } else {
    console.warn('db-download-link 요소가 HTML에 존재하지 않습니다.');
  }
}