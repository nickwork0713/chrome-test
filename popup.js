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

      const getApPassBtn = document.querySelector('#getAPpass')
      const addVenueBtn = document.querySelector('#addVenue')

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

      /*
      <-----------Util Functions End------------------------------------------------------>
      */

      /*
      <-----------Event Listeners Start------------------------------------------------------>
      */
      document.addEventListener("DOMContentLoaded", function() {
        const tab1 = document.getElementById("tab1");
        const tab2 = document.getElementById("tab2");
        const tab1Content = document.getElementById("tab1-content");
        const tab2Content = document.getElementById("tab2-content");

        tab1.classList.add("active");
        tab1Content.style.display = "block";
        tab2Content.style.display = "none";
      
        tab1.addEventListener("click", function() {
          tab1.classList.add("active");
          tab2.classList.remove("active");
          tab1Content.style.display = "block";
          tab2Content.style.display = "none";
        });
      
        tab2.addEventListener("click", function() {
          tab1.classList.remove("active");
          tab2.classList.add("active");
          tab1Content.style.display = "none";
          tab2Content.style.display = "block";
        });
      });

      getApPassBtn?.addEventListener('click', async () => {
          const activeTab = await getActiveTabURL()
          const tabUrlAll = activeTab.url
          const tabUrlParts = tabUrlAll.replace(/^(https?:\/\/)?/, "").split("/");
          const testenv = tabUrlParts[0]
          var venueGroups=[]; 
          var testTenantId = tabUrlParts[1] // Pver R1
          if (testTenantId === 'api') {
            //The UI is in pver ACX.
            testTenantId = tabUrlParts[4] // Pver ACX
          }
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
                          'injectionResults of getApPassBtn.addEventListener',
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
                          const apiUrlWifi = 'https://' + testenv + '/api/tenant/' + testTenantId + '/wifi';
                          const apiUrlVenue = 'https://' + testenv + '/api/tenant/' + testTenantId + '/venue';
                          //const apiUrl = 'https://api.dev.ruckus.cloud/api/tenant/' + testTenantId + '/wifi';
                          //console.log('apiUrl : ' + apiUrlWifi);
                          const myHeaders = new Headers();
                          const jwtToken = `Bearer ${jwtString}` 
                          myHeaders.append("Authorization", jwtToken);
                          myHeaders.append("Content-Type", 'application/json');
                          myHeaders.append("Access-Control-Allow-Origin", '*');
                          //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab

                          const request1 = new Request(apiUrlVenue, {
                            method: "GET",
                            headers: myHeaders,
                            credentials: 'include'
                          });
                          console.log(request1);

                          //fetch(request).then(resp => console.log(resp))
                          fetch(request1)
                          .then(response => response.json())
                          .then(data => {
                            console.log(data); // Process the response data as needed
                            // Parse id and apPassword from the response
   
                            const venuesArray=data
                            for (var i = 0; i < venuesArray.length; i++) {
                                var element1=venuesArray[i];
                                var api1VenueId=element1.id
                                var api1VenueName=element1.name
                                //console.log("id: " + api1VenueId + ", Venue name: " + api1VenueName);
                                var group1 = {id: api1VenueId, name: api1VenueName};
                                venueGroups.push(group1);
                            }
                            //if (venueGroups.length > 0) {
                            //    console.log('venueGroups: ' + venueGroups[0]);
                            //} else {
                            //    console.log('venueGroups is empty');
                            //}
                          })
                          .catch(error => {
                            console.log(error);
                          });

                          function getVenueNameById(id) {
                            // Iterate over the groups array
                            for (var i = 0; i < venueGroups.length; i++) {
                            var group = venueGroups[i];
                            // Check if the group's id matches the given id
                            if (group.id === id) {
                            // Return the user associated with the matching id
                            return group.name;
                            }
                            }
                            // If no matching id is found, return null or handle the case as needed
                            return null;
                          }

                          function AppendApPasswordById(id, password) {
                            // Iterate over the groups array
                            for (var i = 0; i < venueGroups.length; i++) {
                              var group = venueGroups[i];
                              // Check if the group's id matches the given id
                              if (group.id === id) {
                              // Return the user associated with the matching id
                                group.password = password
                              }
                            }
                            // If no matching id is found, return null or handle the case as needed
                            return null;
                          }

                          const request2 = new Request(apiUrlWifi, {
                            method: "GET",
                            headers: myHeaders,
                            credentials: 'include'
                          });
                          console.log(request2);

                          //fetch(request).then(resp => console.log(resp))
                          fetch(request2)
                          .then(response => response.json())
                          .then(data => {
                            console.log(data); // Process the response data as needed
                            // Parse id and apPassword from the response
                            const wifiArray=data.venues
                            for (var i = 0; i < wifiArray.length; i++) {
                                var element2 = wifiArray[i];
                                var api2VenueId=element2.id
                                var api2ApPassword=element2.apPassword
                                AppendApPasswordById(api2VenueId, api2ApPassword);
                                //console.log("id: " + api2VenueId + ", AP Pass: " + api2ApPassword);
                                //var matchVenueName = getVenueNameById(api2VenueId);
                                //console.log('Name: ' + matchVenueName + ' ,AP Password: ' + api2ApPassword + ' ,id: ' + api2VenueId)
                            }
                            // Get the container element
                            var groupContainer = document.getElementById('groupContainer');
                            groupContainer.innerHTML = '';

                            venueGroups.sort(function(a, b) {
                                var nameA = a.name.toUpperCase();
                                var nameB = b.name.toUpperCase();
                                if (nameA < nameB) {
                                  return -1;
                                }
                                if (nameA > nameB) {
                                  return 1;
                                }
                                return 0;
                            });

                            var table = document.querySelector('#groupTable');
                            var headerRow = document.querySelector('#headerRow');

                            // Clear any existing content in the header row
                            headerRow.innerHTML = '';
                            // Get the keys of the first group object
                            var groupKeys = Object.keys(venueGroups[0]);

                            // Iterate over the keys and create table header cells
                            for (var i = 0; i < groupKeys.length; i++) {
                                var key = groupKeys[i];
  
                                // Create a new table header cell
                                var headerCell = document.createElement('th');
  
                                // Set the content of the header cell as the key
                                headerCell.textContent = key;
  
                                // Append the header cell to the header row
                                headerRow.appendChild(headerCell);
                            }

                            // Get the table body element
                            var tableBody = table.querySelector('tbody');

                            // Clear any existing rows in the table body
                            tableBody.innerHTML = '';

                            // Iterate over the groups array
                            for (var i = 0; i < venueGroups.length; i++) {
                                var group = venueGroups[i];
                                /*
                                // Create a new paragraph element to display user and pass
                                var paragraph = document.createElement('p');
  
                                // Set the content of the paragraph using user and pass values
                                paragraph.textContent = 'Venue: ' + group.name + ' , AP Password: ' + group.password + ' , id: ' + group.id;
  
                                 // Append the paragraph to the container element
                                groupContainer.appendChild(paragraph);
                                */
                                //for table data
                                // Create a new row element
                                var row = document.createElement('tr');
  
                                // Iterate over the keys and create table cells for each key
                                for (var j = 0; j < groupKeys.length; j++) {
                                    var key = groupKeys[j];
    
                                    // Create a new table cell
                                    var cell = document.createElement('td');
    
                                    // Set the content of the cell using the corresponding value from the group object
                                    cell.textContent = group[key];
    
                                    // Append the cell to the row
                                    row.appendChild(cell);
                                }
  
                                 // Append the row to the table body
                                tableBody.appendChild(row);
                            }
                          })
                          .catch(error => {
                            console.log(error);
                          });

                          //feedBackForSessionStorage.innerHTML = `JWT Key: ${jwtString}` ;
                          //feedBackForSessionStorage.innerHTML =
                          //    'All the session storage values are retrieved123.'
                      }
                  } catch (err) {
                      console.error(
                          'Error occured in injectionResults of getApPassBtn.addEventListener',
                          err
                      )
                  }
              }
          )
      })

      addVenueBtn?.addEventListener('click', async () => {
        const activeTab = await getActiveTabURL()
        const tabUrlAll = activeTab.url
        const tabUrlParts = tabUrlAll.replace(/^(https?:\/\/)?/, "").split("/");
        const testenv = tabUrlParts[0]
        var venueGroups=[]; 
        var testTenantId = tabUrlParts[1] // Pver R1
        if (testTenantId === 'api') {
          //The UI is in pver ACX.
          testTenantId = tabUrlParts[4] // Pver ACX
        }
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
                        'injectionResults of getApPassBtn.addEventListener',
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
                        const apiUrlWifi = 'https://' + testenv + '/api/tenant/' + testTenantId + '/wifi';
                        const apiUrlVenue = 'https://' + testenv + '/api/tenant/' + testTenantId + '/venue';
                        //const apiUrl = 'https://api.dev.ruckus.cloud/api/tenant/' + testTenantId + '/wifi';
                        //console.log('apiUrl : ' + apiUrlWifi);
                        const myHeaders = new Headers();
                        const jwtToken = `Bearer ${jwtString}` 
                        myHeaders.append("Authorization", jwtToken);
                        myHeaders.append("Content-Type", 'application/json');
                        myHeaders.append("Access-Control-Allow-Origin", '*');
                        //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab

                        const request1 = new Request(apiUrlVenue, {
                          method: "GET",
                          headers: myHeaders,
                          credentials: 'include'
                        });
                        console.log(request1);

                        //fetch(request).then(resp => console.log(resp))
                        fetch(request1)
                        .then(response => response.json())
                        .then(data => {
                          console.log(data); // Process the response data as needed
                          // Parse id and apPassword from the response
 
                          const venuesArray=data
                          for (var i = 0; i < venuesArray.length; i++) {
                              var element1=venuesArray[i];
                              var api1VenueId=element1.id
                              var api1VenueName=element1.name
                              //console.log("id: " + api1VenueId + ", Venue name: " + api1VenueName);
                              var group1 = {id: api1VenueId, name: api1VenueName};
                              venueGroups.push(group1);
                          }
                          //if (venueGroups.length > 0) {
                          //    console.log('venueGroups: ' + venueGroups[0]);
                          //} else {
                          //    console.log('venueGroups is empty');
                          //}
                        })
                        .catch(error => {
                          console.log(error);
                        });

                        function getVenueNameById(id) {
                          // Iterate over the groups array
                          for (var i = 0; i < venueGroups.length; i++) {
                          var group = venueGroups[i];
                          // Check if the group's id matches the given id
                          if (group.id === id) {
                          // Return the user associated with the matching id
                          return group.name;
                          }
                          }
                          // If no matching id is found, return null or handle the case as needed
                          return null;
                        }

                        function AppendApPasswordById(id, password) {
                          // Iterate over the groups array
                          for (var i = 0; i < venueGroups.length; i++) {
                            var group = venueGroups[i];
                            // Check if the group's id matches the given id
                            if (group.id === id) {
                            // Return the user associated with the matching id
                              group.password = password
                            }
                          }
                          // If no matching id is found, return null or handle the case as needed
                          return null;
                        }

                        const request2 = new Request(apiUrlWifi, {
                          method: "GET",
                          headers: myHeaders,
                          credentials: 'include'
                        });
                        console.log(request2);

                        //fetch(request).then(resp => console.log(resp))
                        fetch(request2)
                        .then(response => response.json())
                        .then(data => {
                          console.log(data); // Process the response data as needed
                          // Parse id and apPassword from the response
                          const wifiArray=data.venues
                          for (var i = 0; i < wifiArray.length; i++) {
                              var element2 = wifiArray[i];
                              var api2VenueId=element2.id
                              var api2ApPassword=element2.apPassword
                              AppendApPasswordById(api2VenueId, api2ApPassword);
                              //console.log("id: " + api2VenueId + ", AP Pass: " + api2ApPassword);
                              //var matchVenueName = getVenueNameById(api2VenueId);
                              //console.log('Name: ' + matchVenueName + ' ,AP Password: ' + api2ApPassword + ' ,id: ' + api2VenueId)
                          }
                          // Get the container element
                          var groupContainer = document.getElementById('groupContainer');
                          groupContainer.innerHTML = '';

                          venueGroups.sort(function(a, b) {
                              var nameA = a.name.toUpperCase();
                              var nameB = b.name.toUpperCase();
                              if (nameA < nameB) {
                                return -1;
                              }
                              if (nameA > nameB) {
                                return 1;
                              }
                              return 0;
                          });

                          var table = document.querySelector('#groupTable');
                          var headerRow = document.querySelector('#headerRow');

                          // Clear any existing content in the header row
                          headerRow.innerHTML = '';
                          // Get the keys of the first group object
                          var groupKeys = Object.keys(venueGroups[0]);

                          // Iterate over the keys and create table header cells
                          for (var i = 0; i < groupKeys.length; i++) {
                              var key = groupKeys[i];

                              // Create a new table header cell
                              var headerCell = document.createElement('th');

                              // Set the content of the header cell as the key
                              headerCell.textContent = key;

                              // Append the header cell to the header row
                              headerRow.appendChild(headerCell);
                          }

                          // Get the table body element
                          var tableBody = table.querySelector('tbody');

                          // Clear any existing rows in the table body
                          tableBody.innerHTML = '';

                          // Iterate over the groups array
                          for (var i = 0; i < venueGroups.length; i++) {
                              var group = venueGroups[i];
                              /*
                              // Create a new paragraph element to display user and pass
                              var paragraph = document.createElement('p');

                              // Set the content of the paragraph using user and pass values
                              paragraph.textContent = 'Venue: ' + group.name + ' , AP Password: ' + group.password + ' , id: ' + group.id;

                               // Append the paragraph to the container element
                              groupContainer.appendChild(paragraph);
                              */
                              //for table data
                              // Create a new row element
                              var row = document.createElement('tr');

                              // Iterate over the keys and create table cells for each key
                              for (var j = 0; j < groupKeys.length; j++) {
                                  var key = groupKeys[j];
  
                                  // Create a new table cell
                                  var cell = document.createElement('td');
  
                                  // Set the content of the cell using the corresponding value from the group object
                                  cell.textContent = group[key];
  
                                  // Append the cell to the row
                                  row.appendChild(cell);
                              }

                               // Append the row to the table body
                              tableBody.appendChild(row);
                          }
                        })
                        .catch(error => {
                          console.log(error);
                        });

                        //feedBackForSessionStorage.innerHTML = `JWT Key: ${jwtString}` ;
                        //feedBackForSessionStorage.innerHTML =
                        //    'All the session storage values are retrieved123.'
                    }
                } catch (err) {
                    console.error(
                        'Error occured in injectionResults of getApPassBtn.addEventListener',
                        err
                    )
                }
            }
        )
    })

      /*
      <-----------Event Listeners End------------------------------------------------------>
      */
  } catch (err) {
      console.error('Error occured in global popup.js', err)
  }
})()