chrome.action.onClicked.addListener((tab) => {
  console.log('Current Tab URL:', chrome.tab.url);
});