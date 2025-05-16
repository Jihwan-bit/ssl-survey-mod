import fetch from 'node-fetch';

const { GITHUB_TOKEN, OWNER, REPO, BRANCH } = process.env;
if (!GITHUB_TOKEN || !OWNER || !REPO || !BRANCH) {
  throw new Error('Missing required environment variables in .env');
}

const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

/**
 * 주어진 경로의 파일이 GitHub에 존재하면 SHA를, 없으면 undefined를 반환.
 * @param {string} path — 저장할 파일 경로 (예: 'results/data.xlsx')
 * @returns {Promise<string|undefined>}
 */
export async function getFileSha(path) {
  const url = `${API_ROOT}/${encodeURIComponent(path)}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (res.status === 200) {
    const { sha } = await res.json();
    return sha;
  } else if (res.status === 404) {
    return undefined;
  } else {
    const err = await res.json();
    throw new Error(`GitHub API getFileSha error: ${res.status} – ${err.message}`);
  }
}

/**
 * Blob, ArrayBuffer, 또는 Buffer를 Base64 문자열로 변환.
 * @param {Blob|ArrayBuffer|Buffer} blob
 * @returns {Promise<string>}
 */
export async function blobToBase64(blob) {
  let buffer;

  if (blob.arrayBuffer) {
    // 브라우저 Blob → ArrayBuffer
    buffer = await blob.arrayBuffer();
  } else if (blob instanceof ArrayBuffer) {
    buffer = blob;
  } else if (Buffer.isBuffer(blob)) {
    buffer = blob;
  } else {
    throw new Error('Unsupported blob type for Base64 conversion');
  }

  return Buffer.from(buffer).toString('base64');
}

/**
 * GitHub에 파일을 생성하거나 업데이트.
 * @param {string} path — 저장 경로 (예: 'results/data.xlsx')
 * @param {string|Blob|ArrayBuffer|Buffer} contentSrc — Base64 문자열 또는 변환 가능한 Blob/ArrayBuffer/Buffer
 * @param {string} message — 커밋 메시지
 * @returns {Promise<object>} — GitHub API 응답 JSON
 */
export async function uploadFile(path, contentSrc, message) {
  // 1) 기존 파일 SHA 조회
  const sha = await getFileSha(path);

  // 2) contentSrc가 Base64 문자열이 아닐 경우 변환
  const content = typeof contentSrc === 'string'
    ? contentSrc
    : await blobToBase64(contentSrc);

  // 3) PUT 요청으로 생성 또는 업데이트
  const url = `${API_ROOT}/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      content,
      branch: BRANCH,
      ...(sha && { sha })
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub uploadFile error: ${res.status} – ${err.message}`);
  }

  return res.json();
}