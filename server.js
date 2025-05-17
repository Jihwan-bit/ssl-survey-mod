// server.js

import { uploadFile } from './githubApi.js';

const express = require('express');
const app     = express();

app.post('/api/upload', async (req, res) => {
  const { path, content, commitMessage } = req.body;
  try {
    const result = await uploadFile(path, content, commitMessage);
    res.json({ rawUrl: result.content.download_url });
  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const fs      = require('fs');
const path    = require('path');
const PORT    = process.env.PORT || 3000;

// JSON 바디 파싱: Base64 전송용으로 최대 50MB 허용
app.use(express.json({
  limit: '50mb'
}));


// 데이터 저장 디렉터리 설정
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'docs')));  // 실제 경로로 조정


// ─── 설문 결과 저장 API ─────────────────────────────
// JSON 바디 최대 50MB 허용
app.use(express.json({ limit: '50mb' }));

// data 폴더가 없으면 생성
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── 설문 엑셀 자동 저장 API ───────────────────────────────
app.post('/api/save-excel', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json({ success: false, error: 'filename 및 content 필요' });
  }

  const filePath = path.join(DATA_DIR, filename);
  try {
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filePath, buffer);
    return res.json({ success: true, file: filePath });
  } catch (err) {
    console.error('[/api/save-excel] 오류', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


// ─── 사용된 코드 저장 API ─────────────────────────────
// ─── 엑셀 자동 저장 API ─────────────────────────────────────
app.post('/api/save-excel', (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).json({
      success: false,
      error: 'filename과 content(베이스64 문자열)가 필요합니다.'
    });
  }

  // 1) 저장할 전체 경로
  const filePath = path.join(DATA_DIR, filename);

  try {
    // 2) Base64 → Buffer
    const fileBuffer = Buffer.from(content, 'base64');

    // 3) 파일 쓰기
    fs.writeFileSync(filePath, fileBuffer);

    // 4) 성공 응답
    res.json({ success: true, file: filePath });
  } catch (err) {
    console.error('[/api/save-excel] 파일 저장 중 오류:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ─── (선택) 정적 파일 제공 ─────────────────────────────
// 클라이언트(index.html, script.js, .xlsx 등)가 docs/ 폴더에 있을 경우:
app.use(express.static(path.join(__dirname, 'docs')));

app.listen(PORT, () => {
  console.log(`▶ Server running at http://localhost:${PORT}`);
});