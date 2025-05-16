// server.js

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app     = express();
const PORT    = process.env.PORT || 3000;

// JSON 바디 파싱 미들웨어
app.use(express.json());

// 데이터 저장 디렉터리 설정
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── 설문 결과 저장 API ─────────────────────────────
app.post('/api/save-survey', (req, res) => {
  const { surveyDB } = req.body;
  if (!Array.isArray(surveyDB)) {
    return res.status(400).json({ success: false, error: 'surveyDB 배열이 필요합니다.' });
  }

  const filePath = path.join(DATA_DIR, 'surveyDB.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(surveyDB, null, 2), 'utf8');
    res.json({ success: true, file: filePath });
  } catch (err) {
    console.error('save-survey 오류:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 사용된 코드 저장 API ─────────────────────────────
app.post('/api/save-codes', (req, res) => {
  const { usedCodes } = req.body;
  if (!Array.isArray(usedCodes)) {
    return res.status(400).json({ success: false, error: 'usedCodes 배열이 필요합니다.' });
  }

  const filePath = path.join(DATA_DIR, 'usedCodes.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify(usedCodes, null, 2), 'utf8');
    res.json({ success: true, file: filePath });
  } catch (err) {
    console.error('save-codes 오류:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── (선택) 정적 파일 제공 ─────────────────────────────
// 클라이언트(index.html, script.js, .xlsx 등)가 docs/ 폴더에 있을 경우:
// app.use(express.static(path.join(__dirname, 'docs')));

app.listen(PORT, () => {
  console.log(`▶ Server running at http://localhost:${PORT}`);
});