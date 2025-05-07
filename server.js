// server.js
const express = require('express');
const path    = require('path');
const XLSX    = require('xlsx');
const fs      = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 2) Question_List.xlsx 읽어서 질문 배열로 변환
const workbook = XLSX.readFile(path.join(__dirname, 'Question_List.xlsx'));
const sheet    = workbook.Sheets[workbook.SheetNames[0]];
const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const questions = rows.slice(1).map(r => r[0]);

// 3) 질문 목록 API
app.get('/api/questions', (req, res) => {
  res.json({ questions });
});

// 4) 응답 수신 → 엑셀 생성 → 파일 URL 반환
app.post('/api/submit', (req, res) => {
  const {
    name, school, gender,
    region, subregion, middle, msFlag,
    bcount, schooltype,
    answers
  } = req.body;

  // 설명 레이블 매핑
  const LABELS = {5:'매우 그렇다',4:'약간 그렇다',3:'보통',2:'약간 아니다',1:'매우 아니다'};

  // 엑셀에 쓸 데이터 배열
  const data = [
    ['학생 성명',      name],
    ['출신 학교',      school],
    ['성별',           gender],
    ['거주 지역',      region],
    ['서울 세부 권역',  subregion],
    ['출신 중학교',    middle],
    ['중학교 플래그',   msFlag],
    ['B등급 과목 수',  bcount],
    ['희망 고교 분류',  schooltype],
    [],
    ['문항 번호','문항','점수','설명']
  ];

  questions.forEach((q, i) => {
    const ans = answers[i];
    data.push([
      i+1,
      q,
      ans,
      LABELS[ans] || ''
    ]);
  });

  // 워크북/시트 생성
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Responses');

  // 파일 쓰기
  const dir      = path.join(__dirname, 'public', 'responses');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fname    = `response_${Date.now()}.xlsx`;
  const fpath    = path.join(dir, fname);
  XLSX.writeFile(wb, fpath);

  // URL 반환
  const fileUrl = `${req.protocol}://${req.get('host')}/responses/${fname}`;
  res.json({ fileUrl });
});

// 5) 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
