// Background service worker for Studocu Helper

const TARGET_DOMAINS = ['studocu.com', 'studocu.vn'];
const NAV_FILTER = {
  url: [
    { hostContains: 'studocu.com' },
    { hostContains: 'studocu.vn' }
  ]
};

// Xoá cookie studocu nhanh bằng Promise.all
async function clearStudocuCookies() {
  let count = 0;
  try {
    for (const domain of TARGET_DOMAINS) {
      const cookies = await chrome.cookies.getAll({ domain });
      const tasks = cookies.map(cookie => {
        count++;
        const protocol = cookie.secure ? 'https:' : 'http:';
        const cleanDomain = cookie.domain.replace(/^\./, '');
        const url = `${protocol}//${cleanDomain}${cookie.path}`;
        return chrome.cookies.remove({
          url,
          name: cookie.name,
          storeId: cookie.storeId
        });
      });
      await Promise.all(tasks);
    }
  } catch (err) {
    console.error('[Studocu Helper] Lỗi xóa cookies:', err);
  }
  return count;
}

// Xoá cookie trước khi request bắt đầu gửi đi
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) {
    await clearStudocuCookies();
  }
}, NAV_FILTER);

// Xử lý thông điệp từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clearCookies') {
    clearStudocuCookies().then(count => {
      sendResponse({ success: true, count });
      if (sender.tab?.id) {
        chrome.tabs.reload(sender.tab.id);
      }
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});

// Bấm icon extension trên toolbar để bật/tắt bảng điều khiển
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }).catch(() => {});
  }
});
