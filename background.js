//  gsheets-namedranges-filter	/  0.1 	/	background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveFilters') {
    const data = {};
    data[request.key] = request.filters;
    chrome.storage.local.set(data, () => {
      sendResponse({ success: true });
    });
    return true; // keep channel open for sendResponse
  } else if (request.action === 'loadFilters') {
    chrome.storage.local.get(request.key, data => {
      sendResponse({ filters: data[request.key] || [] });
    });
    return true;
  }
});
