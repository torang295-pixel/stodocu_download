// Content script - Studocu Helper v2.2

// Dọn dẹp bộ nhớ tạm theo dõi lượt xem trên máy khách
(function clearClientStorage() {
  try {
    sessionStorage.clear();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('view') || key.includes('guest') || key.includes('paywall') || key.includes('tracking'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {}
})();

// Vùng chứa tài liệu chính (tránh quét nhầm sidebar và tài liệu gợi ý bên dưới)
function getViewerRoot() {
  return document.getElementById('viewer-wrapper') ||
         document.getElementById('document-wrapper') ||
         document.getElementById('page-container') ||
         document.querySelector('[data-testid="document-viewer"]') ||
         document.querySelector('.document-viewer') ||
         document.querySelector('.p2hv') ||
         document.body;
}

// Tìm tổng số trang chính xác của tài liệu hiện tại
function getTotalPageCount() {
  try {
    const ndEl = document.getElementById('__NEXT_DATA__');
    if (ndEl) {
      const nd = JSON.parse(ndEl.textContent);
      const doc = nd?.props?.pageProps?.document ||
                  nd?.props?.pageProps?.doc ||
                  nd?.props?.pageProps?.initialDocument;
      if (doc) {
        const p = doc.numberOfPages || doc.pageCount || doc.totalPages || doc.numPages;
        if (typeof p === 'number' && p > 0 && p < 5000) return p;
      }
      const count = findPageCount(nd?.props?.pageProps, 0);
      if (count > 0) return count;
    }
  } catch (e) {}

  const root = getViewerRoot();
  const attrs = ['data-total-pages', 'data-num-pages', 'data-page-count', 'data-pages'];
  for (const attr of attrs) {
    const el = document.querySelector(`[${attr}]`);
    if (el) {
      const val = parseInt(el.getAttribute(attr), 10);
      if (val > 0 && val < 5000) return val;
    }
  }

  // Quét text phân trang (ví dụ: "page 1 of 15" hoặc "1 / 15")
  const allEls = document.querySelectorAll('span, div, p');
  for (const el of allEls) {
    if (el.children.length > 2) continue;
    const text = (el.textContent || '').trim();
    if (text.length > 50) continue;
    const m = text.match(/page\s*\d+\s*(?:of|\/)\s*(\d+)/i) ||
              text.match(/(\d+)\s*(?:of|\/)\s*(\d+)\s*page/i);
    if (m) {
      const n = parseInt(m[m.length - 1], 10);
      if (n > 0 && n < 5000) return n;
    }
  }

  let max = 0;
  root.querySelectorAll('[data-page-index]').forEach(el => {
    const idx = parseInt(el.dataset.pageIndex, 10);
    if (!isNaN(idx) && idx + 1 > max) max = idx + 1;
  });
  root.querySelectorAll('[data-page-no]').forEach(el => {
    const no = parseInt(el.dataset.pageNo, 10);
    if (!isNaN(no) && no > max) max = no;
  });
  if (max > 0) return max;

  return root.querySelectorAll('.pf').length;
}

function findPageCount(obj, depth) {
  if (depth > 8 || !obj || typeof obj !== 'object') return 0;
  const keys = ['numberOfPages', 'pageCount', 'totalPages', 'numPages'];
  for (const k of keys) {
    if (typeof obj[k] === 'number' && obj[k] > 0 && obj[k] < 5000) {
      return obj[k];
    }
  }
  for (const k of Object.keys(obj)) {
    if (/related|recommend|similar|other|user|course/i.test(k)) continue;
    const r = findPageCount(obj[k], depth + 1);
    if (r > 0) return r;
  }
  return 0;
}

// Trích xuất số trang (1-based) từ phần tử DOM một cách chuẩn xác
function extractPageNumber(el) {
  if (!el) return null;
  if (el.hasAttribute('data-page-no')) {
    const n = parseInt(el.getAttribute('data-page-no'), 10);
    if (n > 0) return n;
  }
  if (el.hasAttribute('data-page-index')) {
    const n = parseInt(el.getAttribute('data-page-index'), 10);
    if (!isNaN(n) && n >= 0) return n + 1;
  }
  const id = el.id || '';
  const m = id.match(/^pf([0-9a-f]+)$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    if (n > 0) return n;
  }
  if (el.parentElement && el.parentElement !== document.body) {
    if (el.parentElement.hasAttribute('data-page-index')) {
      const n = parseInt(el.parentElement.getAttribute('data-page-index'), 10);
      if (!isNaN(n) && n >= 0) return n + 1;
    }
    if (el.parentElement.hasAttribute('data-page-no')) {
      const n = parseInt(el.parentElement.getAttribute('data-page-no'), 10);
      if (n > 0) return n;
    }
  }
  const child = el.querySelector && el.querySelector('.pf, [data-page-no]');
  if (child) {
    if (child.hasAttribute('data-page-no')) {
      const n = parseInt(child.getAttribute('data-page-no'), 10);
      if (n > 0) return n;
    }
    const cm = (child.id || '').match(/^pf([0-9a-f]+)$/i);
    if (cm) {
      const n = parseInt(cm[1], 16);
      if (n > 0) return n;
    }
  }
  return null;
}

// Chỉ lấy các container đại diện trang cấp 1, loại bỏ phần tử lồng nhau gây trùng lặp
function getPageHolders(root) {
  const wrappers = Array.from(root.querySelectorAll('[data-page-index]'));
  if (wrappers.length > 0) {
    return wrappers.filter(w => !w.parentElement.closest('[data-page-index]'));
  }
  const pfs = Array.from(root.querySelectorAll('.pf'));
  if (pfs.length > 0) {
    return pfs.filter(p => !p.parentElement.closest('.pf'));
  }
  return [];
}

// Lấy mẫu URL ảnh nền gốc độ phân giải cao từ __NEXT_DATA__ hoặc DOM
function getImagePattern() {
  try {
    const ndEl = document.getElementById('__NEXT_DATA__');
    if (ndEl) {
      const nd = JSON.parse(ndEl.textContent);
      const da = nd?.props?.pageProps?.documentAccess;
      if (da?.objectKey && da?.signedQueryParams?.png) {
        return {
          prefix: `https://doc-assets.studocu.com/${da.objectKey}/html/bg`,
          suffix: `.png${da.signedQueryParams.png}`
        };
      }
    }
  } catch (e) {}

  const root = getViewerRoot();
  const imgs = root.querySelectorAll('.pf img, img.bi, .page-content img, img[src*="doc-assets"]');
  for (const img of imgs) {
    const s = img.src || img.getAttribute('data-src') || '';
    if (s.includes('/bg') && s.includes('doc-assets')) {
      const m = s.match(/(.*?\/bg)[0-9a-f]+(\.png\?.*)/i);
      if (m) return { prefix: m[1], suffix: m[2] };
    }
  }
  return null;
}

function getScrollContainer() {
  const candidates = [
    document.getElementById('viewer-wrapper'),
    document.getElementById('document-wrapper'),
    document.querySelector('[data-testid="document-viewer"]'),
    document.querySelector('.document-viewer'),
    document.querySelector('main')
  ];
  for (const c of candidates) {
    if (c && c.scrollHeight > c.clientHeight && c.clientHeight > 0) {
      return c;
    }
  }
  return document.scrollingElement || document.documentElement;
}

function isPageReady(el) {
  if (!el) return false;
  const hasSpans = el.querySelectorAll('span, .t').length > 1;
  const img = el.querySelector('img.bi') || el.querySelector('img');
  const imgLoaded = img && (img.complete && img.naturalWidth > 0);
  return el.innerHTML.length > 300 && (hasSpans || imgLoaded);
}

async function waitForPage(el, timeout = 2500) {
  if (isPageReady(el)) return true;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 80));
    if (isPageReady(el)) return true;
  }
  return false;
}

// Bắt từng trang trong khi cuộn, loại trừ triệt để trang thừa/trùng lặp
async function captureAllPages(expectedTotal, onProgress) {
  const viewerRoot = getViewerRoot();
  const scroller = getScrollContainer();
  const isWindow = scroller === document.documentElement || scroller === document.body;
  const savedScroll = isWindow ? window.scrollY : scroller.scrollTop;

  const capturedMap = new Map();

  const collectCurrentPages = () => {
    const holders = getPageHolders(viewerRoot);
    for (const node of holders) {
      const pageNum = extractPageNumber(node);
      if (!pageNum) continue;
      if (expectedTotal > 0 && pageNum > expectedTotal) continue;
      if (capturedMap.has(pageNum)) continue;

      const pf = node.classList.contains('pf') ? node : (node.querySelector('.pf') || node);
      if (isPageReady(pf)) {
        capturedMap.set(pageNum, pf.cloneNode(true));
        if (onProgress) onProgress(capturedMap.size, expectedTotal || capturedMap.size);
      }
    }
  };

  collectCurrentPages();

  const pageHolders = getPageHolders(viewerRoot);
  if (pageHolders.length > 0 && expectedTotal > 0 && pageHolders.length >= expectedTotal) {
    for (let i = 0; i < pageHolders.length; i++) {
      const holder = pageHolders[i];
      const pageNum = extractPageNumber(holder) || (i + 1);
      if (expectedTotal > 0 && pageNum > expectedTotal) continue;
      if (capturedMap.has(pageNum)) continue;

      holder.scrollIntoView({ behavior: 'instant', block: 'center' });
      const pf = holder.classList.contains('pf') ? holder : (holder.querySelector('.pf') || holder);
      await waitForPage(pf, 1800);
      capturedMap.set(pageNum, pf.cloneNode(true));
      if (onProgress) onProgress(capturedMap.size, expectedTotal);
    }
  } else {
    const scrollHeight = isWindow ? document.body.scrollHeight : scroller.scrollHeight;
    const clientHeight = isWindow ? window.innerHeight : scroller.clientHeight;
    const step = Math.max(350, clientHeight * 0.7);
    let currentY = 0;

    while (currentY <= scrollHeight + step) {
      if (isWindow) window.scrollTo(0, currentY);
      else scroller.scrollTop = currentY;

      await new Promise(r => setTimeout(r, 120));
      collectCurrentPages();

      if (expectedTotal > 0 && capturedMap.size >= expectedTotal) break;
      currentY += step;
    }
  }

  if (isWindow) window.scrollTo(0, savedScroll);
  else scroller.scrollTop = savedScroll;

  let pages = Array.from(capturedMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(entry => ({ pageNum: entry[0], element: entry[1] }));

  // Giới hạn tuyệt đối đúng số trang gốc của tài liệu
  if (expectedTotal > 0) {
    pages = pages.filter(p => p.pageNum >= 1 && p.pageNum <= expectedTotal);
  }

  return pages;
}

// Xử lý chuẩn hóa từng trang, gỡ paywall và nạp ảnh độ nét cao
function preparePageElement(pfClone, pageNum, pattern) {
  pfClone.style.setProperty('position', 'relative', 'important');
  pfClone.style.setProperty('top', 'auto', 'important');
  pfClone.style.setProperty('left', 'auto', 'important');
  pfClone.style.setProperty('bottom', 'auto', 'important');
  pfClone.style.setProperty('right', 'auto', 'important');
  pfClone.style.setProperty('transform', 'none', 'important');
  pfClone.style.setProperty('margin', '0 auto', 'important');
  pfClone.style.setProperty('display', 'block', 'important');
  pfClone.style.setProperty('visibility', 'visible', 'important');
  pfClone.style.setProperty('opacity', '1', 'important');
  pfClone.style.setProperty('filter', 'none', 'important');

  // Xóa lớp phủ paywall, quảng cáo, nút thừa
  const unwanted = pfClone.querySelectorAll(
    '[class*="paywall"], [class*="Paywall"], [class*="banner"], [class*="Banner"], ' +
    '[class*="overlay"], [class*="Overlay"], [class*="unlock"], [class*="Unlock"], ' +
    '[class*="premium"], [class*="Premium"], [class*="blurred-image-wrapper"], ' +
    '[class*="BlurredImage"], button, .download-button-1, [data-studocuhack]'
  );
  unwanted.forEach(el => el.remove());

  // Phục hồi chữ bị ẩn/mờ trên các trang khóa
  pfClone.querySelectorAll('[style]').forEach(el => {
    const st = el.getAttribute('style') || '';
    let updated = st;
    if (/display\s*:\s*none/i.test(updated)) {
      updated = updated.replace(/display\s*:\s*none/gi, 'display: block');
    }
    if (/visibility\s*:\s*hidden/i.test(updated)) {
      updated = updated.replace(/visibility\s*:\s*hidden/gi, 'visibility: visible');
    }
    if (/filter\s*:[^;]+/i.test(updated)) {
      updated = updated.replace(/filter\s*:[^;]+/gi, 'filter: none');
    }
    if (/opacity\s*:\s*0(?:\.0*)?(?:;|$)/i.test(updated)) {
      updated = updated.replace(/opacity\s*:\s*0(?:\.0*)?/gi, 'opacity: 1');
    }
    if (updated !== st) {
      el.setAttribute('style', updated);
    }
  });

  const pc = pfClone.querySelector('.pc');
  if (pc) {
    pc.style.display = 'block';
    pc.style.visibility = 'visible';
    pc.style.opacity = '1';
    pc.style.filter = 'none';
  }

  // Cập nhật ảnh nền gốc không mờ, độ phân giải cao nhất
  const bgImg = pfClone.querySelector('img.bi') || pfClone.querySelector('img');
  if (bgImg) {
    if (pattern) {
      const hexPage = pageNum.toString(16);
      bgImg.src = pattern.prefix + hexPage + pattern.suffix;
    }
    bgImg.removeAttribute('srcset');
    bgImg.removeAttribute('data-src');
    bgImg.style.setProperty('filter', 'none', 'important');
    bgImg.style.setProperty('opacity', '1', 'important');
    bgImg.style.setProperty('visibility', 'visible', 'important');
  }

  return pfClone;
}

// Chờ tất cả ảnh tải xong trước khi in để tránh trang trắng
async function waitForAllImages(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  const promises = imgs.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 3500);
    });
  });
  await Promise.all(promises);
}

// Xuất file PDF chuẩn xác số trang và chất lượng
async function processAndExportPDF() {
  updateStatus('Đang xác định số trang...', true);
  const totalPages = getTotalPageCount();

  const pattern = getImagePattern();

  const capturedPages = await captureAllPages(totalPages, (done, total) => {
    updateStatus(`Đang nạp trang ${done}/${total}...`, true);
  });

  if (capturedPages.length === 0) {
    alert('⚠️ Không tìm thấy trang tài liệu nào trên trang hiện tại.');
    updateStatus('Lỗi: không tìm thấy trang', false);
    return;
  }

  // Khử trang thừa so với tổng số trang phát hiện
  let finalPages = capturedPages;
  if (totalPages > 0 && finalPages.length > totalPages) {
    finalPages = finalPages.filter(p => p.pageNum <= totalPages);
  }

  updateStatus(`Đang tạo trang in (${finalPages.length} trang)...`, true);

  const existing = document.getElementById('clean-viewer-container');
  if (existing) existing.remove();

  const viewerContainer = document.createElement('div');
  viewerContainer.id = 'clean-viewer-container';
  viewerContainer.className = 'p2hv';

  const pageContainer = document.createElement('div');
  pageContainer.id = 'page-container';
  pageContainer.className = 'p2hv';

  finalPages.forEach(({ pageNum, element }) => {
    const prepared = preparePageElement(element, pageNum, pattern);
    pageContainer.appendChild(prepared);
  });

  viewerContainer.appendChild(pageContainer);
  document.body.appendChild(viewerContainer);
  document.body.classList.add('studocu-printing');

  // Đổi tiêu đề để trình duyệt tự đặt tên file PDF theo tên tài liệu
  const originalTitle = document.title;
  const docTitle = document.querySelector('h1')?.textContent?.trim();
  if (docTitle) {
    document.title = docTitle.replace(/[\\/:*?"<>|]/g, '_');
  }

  updateStatus('Đang tải ảnh nền gốc...', true);
  await waitForAllImages(viewerContainer);

  window.addEventListener('afterprint', () => {
    const container = document.getElementById('clean-viewer-container');
    if (container) container.remove();
    document.body.classList.remove('studocu-printing');
    document.title = originalTitle;
    updateStatus('Đã sẵn sàng', false);
  }, { once: true });

  updateStatus('Đang mở hộp thoại in...', false);
  setTimeout(() => {
    window.print();
  }, 250);
}

// Tạo giao diện bảng điều khiển
function createFloatingPanel() {
  if (document.getElementById('studocu-helper-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'studocu-helper-panel';
  panel.className = 'studocu-panel-minimized';
  panel.innerHTML = `
    <div class="studocu-panel-header">
      <div class="studocu-panel-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>Studocu Helper</span>
      </div>
      <div class="studocu-panel-actions">
        <span class="studocu-panel-version">v2.2</span>
        <button id="studocu-close-btn" class="studocu-panel-close" title="Đóng bảng">✕</button>
      </div>
    </div>
    
    <div class="studocu-panel-content">
      <button id="studocu-export-btn" class="studocu-btn studocu-btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>Tạo file PDF (Chuẩn nét)</span>
      </button>
      
      <button id="studocu-bypass-btn" class="studocu-btn studocu-btn-secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
        <span>Bypass & Tải lại</span>
      </button>
      
      <div id="studocu-status" class="studocu-status-bar">
        <span class="studocu-status-dot"></span>
        <span id="studocu-status-text">Đã mở khóa tài liệu</span>
      </div>
      
      <div class="studocu-panel-footer">
        <a href="https://github.com/ruskicoder" target="_blank" class="studocu-github-link">@ruskicoder</a>
      </div>
    </div>
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'studocu-toggle-btn';
  toggleBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  `;
  toggleBtn.title = 'Mở / Đóng Studocu Helper';

  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);

  initEvents(panel, toggleBtn);
}

function initEvents(panel, toggleBtn) {
  const closeBtn = document.getElementById('studocu-close-btn');
  const exportBtn = document.getElementById('studocu-export-btn');
  const bypassBtn = document.getElementById('studocu-bypass-btn');

  const toggle = () => panel.classList.toggle('studocu-panel-minimized');
  toggleBtn.addEventListener('click', toggle);
  if (closeBtn) closeBtn.addEventListener('click', toggle);

  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === 'togglePanel') toggle();
  });

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      await processAndExportPDF();
    } catch (err) {
      updateStatus('Lỗi: ' + err.message, false);
    } finally {
      exportBtn.disabled = false;
    }
  });

  bypassBtn.addEventListener('click', async () => {
    bypassBtn.disabled = true;
    updateStatus('Đang xóa cookies...', true);
    try {
      const res = await chrome.runtime.sendMessage({ action: 'clearCookies' });
      if (res?.success) {
        updateStatus(`Đã xóa ${res.count} cookies! Đang tải lại...`, false);
      } else {
        updateStatus('Lỗi: ' + (res?.error || 'Thất bại'), false);
        bypassBtn.disabled = false;
      }
    } catch (e) {
      updateStatus('Lỗi: ' + e.message, false);
      bypassBtn.disabled = false;
    }
  });
}

function updateStatus(message, isProcessing = false) {
  const statusText = document.getElementById('studocu-status-text');
  const statusBar = document.getElementById('studocu-status');
  if (statusText) statusText.textContent = message;
  if (statusBar) {
    statusBar.classList.toggle('studocu-status-processing', isProcessing);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createFloatingPanel);
} else {
  createFloatingPanel();
}
