;(() => {
  async function getActiveTabURL() {
      try {
          const tabs = await chrome.tabs.query({
              currentWindow: true,
              active: true,
          });
          return tabs[0]
      } catch (err) {
          console.error('Error occured in getActiveTabURL', err)
      }
  }

  try {
      const session = 'session'
      const local = 'local'

      const getLocalStorageBtn = document.querySelector('#getLS')
      const feedBackForLocalStorage = document.querySelector('#feedbackLS')

      const getSessionStorageBtn = document.querySelector('#getSS')
      const feedBackForSessionStorage = document.querySelector('#feedbackSS')

      const footerInfo = document.querySelector('.footerInfo')

      /*
      <-----------Util Functions Start------------------------------------------------------>
      */

      // Get all the storage values from the domain to store it in extension's LS
      function getDomainStorageData(typeOfStorage = 'local') {
          try {
              const selectedStorage =
                  typeOfStorage === 'local' ? localStorage : sessionStorage
              const values = []
              if (selectedStorage) {
                  for (let i = 0; i < selectedStorage?.length; i++) {
                      const key = selectedStorage.key(i)
                      //const test_value = selectedStorage.getItem(key)
                      //console.log(key)
                      //console.log(test_value)
                      const selectedStorageObject = {
                          [key]: selectedStorage.getItem(key),
                      }
                      values.push(selectedStorageObject)
                  }
              }
              console.log(
                  'getDomainStorageData-typeOfStorage-values',
                  typeOfStorage,
                  values?.length || 0
              )
              return values
          } catch (err) {
              console.error(
                  'Error occured in getDomainStorageData',
                  typeOfStorage,
                  err
              )
          }
      }

      function clearExtensionStorage(typeOfStorage = 'local') {
          chrome.storage.local.remove([typeOfStorage], function () {
              const error = chrome.runtime.lastError
              if (error) {
                  console.error(error)
              }
              console.log(
                  'Cleared Existing Chrome Extension Storage!!',
                  typeOfStorage
              )
          })
      }

      function changeFooterTabStyles(target) {
          let infoTitle = document.querySelector('#infoTitle')
          let supportTitle = document.querySelector('#supportTitle')
          let reportTitle = document.querySelector('#reportTitle')
          const allTabs = [infoTitle, supportTitle, reportTitle]
          allTabs.forEach((tab) => {
              if (tab?.id === target) {
                  tab.style.borderBottom = '3px solid black'
                  tab.style.fontWeight = 'bold'
              } else {
                  tab.style.borderBottom = '0px'
                  tab.style.fontWeight = 'normal'
              }
          })
      }

      function showHideFooterTabs(target) {
          let moreinfoContent = document.querySelector('.moreinfoContent')
          let supportContent = document.querySelector('.supportContent')
          let reportContent = document.querySelector('.reportContent')
          const allTabsContent = [
              moreinfoContent,
              supportContent,
              reportContent,
          ]
          allTabsContent.forEach((tab) => {
              console.log(tab.className, 'className')
              if (tab?.className === target) {
                  tab.style.display = 'block'
              } else {
                  tab.style.display = 'none'
              }
          })
      }

      /*
      <-----------Util Functions End------------------------------------------------------>
      */

      /*
      <-----------Event Listeners Start------------------------------------------------------>
      */
      getLocalStorageBtn?.addEventListener('click', async () => {
          const activeTab = await getActiveTabURL()
          const tabId = activeTab?.id
          await clearExtensionStorage(local)
          chrome.scripting.executeScript(
              {
                  target: { tabId: tabId },
                  func: getDomainStorageData,
                  args: [local], // passing typeOfStorage to getDomainStorageData func
              },
              (injectionResults) => {
                  try {
                      console.log(
                          'injectionResults of getLocalStorageBtn.addEventListener',
                          injectionResults[0]?.result?.length ?? 0
                      )
                      for (const frameResult of injectionResults) {
                          const result = frameResult?.result || []
                          chrome.storage.local.set({
                              local: result,
                          })
                          feedBackForLocalStorage.innerHTML =
                              'All the local storage values are retrieved.'
                      }
                  } catch (err) {
                      console.error(
                          'Error occured in injectionResults of getLocalStorageBtn.addEventListener',
                          err
                      )
                  }
              }
          )
      })

      getSessionStorageBtn?.addEventListener('click', async () => {
          const activeTab = await getActiveTabURL()
          const tabUrlAll = activeTab.url
          const tabUrlParts = tabUrlAll.replace(/^(https?:\/\/)?/, "").split("/");
          const testenv = tabUrlParts[0]
          const testTenantId = tabUrlParts[1]
          console.log('tenant id: ' + testTenantId);
          const tabId = activeTab?.id
          await clearExtensionStorage(session)
          chrome.scripting.executeScript(
              {
                  target: { tabId: tabId },
                  func: getDomainStorageData,
                  args: [session], // passing typeOfStorage to getDomainStorageData func
              },
              (injectionResults) => {
                  try {
                      console.log(
                          'injectionResults of getSessionStorageBtn.addEventListener',
                          injectionResults[0]?.result?.length ?? 0
                      )
                      for (const frameResult of injectionResults) {
                          const result = frameResult?.result || []
                          console.log(result[1].jwt);
                          console.log('===');
                          console.log(JSON.stringify(result));
                          chrome.storage.local.set({
                              session: result,
                          });
                          // Retrieve the JWT key from the session storage
                          const jwtString = JSON.stringify(result[1].jwt).slice(1, -1); // Convert the JWT value to a JSON string
                          // const jwtString = JSON.stringify(result.jwt);
                          // Display the JWT key in the feedBackForSessionStorage element
                          const apiUrl = 'https://' + testenv + '/api/tenant/' + testTenantId + '/wifi';
                          //const apiUrl = 'https://api.dev.ruckus.cloud/api/tenant/' + testTenantId + '/wifi';
                          console.log('apiUrl : ' + apiUrl);
                          const myHeaders = new Headers();
                          const jwtToken = `Bearer ${jwtString}` 
                          myHeaders.append("Authorization", jwtToken);
                          myHeaders.append("Content-Type", 'application/json');
                          //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab

                          const request = new Request(apiUrl, {
                            method: "GET",
                            headers: myHeaders,
                            credentials: 'include'
                          });
                          console.log(request);

                          //fetch(request).then(resp => console.log(resp))
                          fetch(request)
                          .then(response => response.json())
                          .then(data => {
                            console.log(data); // Process the response data as needed
                          })
                          .catch(error => {
                            console.error(error);
                          });

                          feedBackForSessionStorage.innerHTML = `JWT Key: ${jwtString}`;
                          //feedBackForSessionStorage.innerHTML =
                          //    'All the session storage values are retrieved123.'
                      }
                  } catch (err) {
                      console.error(
                          'Error occured in injectionResults of getSessionStorageBtn.addEventListener',
                          err
                      )
                  }
              }
          )
      })

      footerInfo.addEventListener('click', (event) => {
          if (event?.target?.id === 'infoTitle') {
              changeFooterTabStyles(event?.target?.id)
              showHideFooterTabs('moreinfoContent')
          } else if (event?.target?.id === 'supportTitle') {
              changeFooterTabStyles(event?.target?.id)
              showHideFooterTabs('supportContent')
          } else if (event?.target?.id === 'reportTitle') {
              changeFooterTabStyles(event?.target?.id)
              showHideFooterTabs('reportContent')
          }
      })

      /*
      <-----------Event Listeners End------------------------------------------------------>
      */
  } catch (err) {
      console.error('Error occured in global popup.js', err)
  }
})()