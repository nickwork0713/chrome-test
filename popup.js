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
      const getEdgePassBtn = document.querySelector('#getEdgepass')
      const addVenueBtn = document.querySelector('#addVenue')
      const queryApDrsBtn = document.querySelector('#queryApDrs')
      const querySwitchDrsBtn = document.querySelector('#querySwitchDrs')

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
        const tab3 = document.getElementById("tab3");
        const tab1Content = document.getElementById("tab1-content");
        const tab2Content = document.getElementById("tab2-content");
        const tab3Content = document.getElementById("tab3-content");

        tab1.classList.add("active");
        tab1Content.style.display = "block";
        tab2Content.style.display = "none";
        tab3Content.style.display = "none";
      
        tab1.addEventListener("click", function() {
          tab1.classList.add("active");
          tab2.classList.remove("active");
          tab3.classList.remove("active");
          tab1Content.style.display = "block";
          tab2Content.style.display = "none";
          tab3Content.style.display = "none";
        });
      
        tab2.addEventListener("click", function() {
          tab1.classList.remove("active");
          tab2.classList.add("active");
          tab3.classList.remove("active");
          tab1Content.style.display = "none";
          tab2Content.style.display = "block";
          tab3Content.style.display = "none";
        });

        tab3.addEventListener("click", function() {
            tab1.classList.remove("active");
            tab2.classList.remove("active");
            tab3.classList.add("active");
            tab1Content.style.display = "none";
            tab2Content.style.display = "none";
            tab3Content.style.display = "block";
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

                            const venueGroupsReMap = venueGroups.map(item => ({
                              name: item.name,
                              password: item.password,
                              id: item.id,
                            }));

                            var table = document.querySelector('#groupTable');
                            var headerRow = document.querySelector('#headerRow');

                            // Clear any existing content in the header row
                            headerRow.innerHTML = '';
                            // Get the keys of the first group object
                            var groupKeys = Object.keys(venueGroupsReMap[0]);

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
                            for (var i = 0; i < venueGroupsReMap.length; i++) {
                                var group = venueGroupsReMap[i];
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

      getEdgePassBtn?.addEventListener('click', async () => {
        const activeTab = await getActiveTabURL()
        const tabUrlAll = activeTab.url
        const tabUrlParts = tabUrlAll.replace(/^(https?:\/\/)?/, "").split("/");
        const testenv = tabUrlParts[0]
        //var edgeSerial = '962494D6C11F9611EE8EC5000C29708ADF'
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
                        const apiUrlEdge = 'https://' + testenv + '/api/' + 'edges';
                        //const apiUrlEdgePass = 'https://' + testenv + '/api/edges/' + edgeSerial + '/passwordDetails';
                        const myHeaders = new Headers();
                        const jwtToken = `Bearer ${jwtString}` 
                        myHeaders.append("Authorization", jwtToken);
                        myHeaders.append("Content-Type", 'application/json');
                        myHeaders.append("Access-Control-Allow-Origin", '*');
                        //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab
                        
                        const request1 = new Request(apiUrlEdge, {
                          method: "GET",
                          headers: myHeaders,
                          credentials: 'include'
                        });
                        console.log(request1);

                        function getEdgeList(request){
                          //fetch(request).then(resp => console.log(resp))
                          fetch(request)
                          .then(response => response.json())
                          .then(data => {
                            console.log(data); // Process the response data as needed
                            // Parse id and apPassword from the response
 
                            const edgesArray=data
                            for (var i = 0; i < edgesArray.length; i++) {
                              var element1=edgesArray[i];
                              var api1EdgeSerial=element1.serialNumber
                              var api1EdgeName=element1.name
                              var group1 = {serial: api1EdgeSerial, name: api1EdgeName};
                              venueGroups.push(group1);
                            }
                          })
                          .catch(error => {
                          console.log(error);
                          });
                        }

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

                        function AppendEdgePasswordBySerial(serial, loginPass, enablePass) {
                          // Iterate over the groups array
                          for (var i = 0; i < venueGroups.length; i++) {
                            var group = venueGroups[i];
                            // Check if the group's id matches the given id
                            if (group.serial === serial) {
                            // Return the user associated with the matching id
                              group.loginPassword = loginPass
                              group.enablePassword = enablePass
                            }
                          }
                          // If no matching id is found, return null or handle the case as needed
                          return null;
                        }

                        //function QueryEachEdgePass(serial) {
                        //  for (var i = 0; i <venueGroups.length; i++) {

                        //  }
                        //}

                        //for (var i = 0; i <venueGroups.length; i++) {
                        //  var edgeSerial = venueGroups[i].serial;
                        //  const reqEachEdgePass = new Request(apiUrlEdgePass, {
                        //    method: "GET",
                        //    headers: myHeaders,
                        //    credentials: 'include'
                        //  });
                        //  console.log(reqEachEdgePass);
                          //fetch(request2)
                          //.then(response => response.json())
                          //.then(data => {
                          //  console.log(data);
                          //})

                          //var api2EdgeSerial=edgeSerial
                          //var api2loginPass=data.loginPassword
                          //var api2enablePass=data.enablePassword
                          //AppendEdgePasswordBySerial(api2EdgeSerial, api2loginPass, api2enablePass);

                        //}
                        
                        
                        function getEdgePwd(url, edgeSerial){
                          const request2 = new Request(url, {
                            method: "GET",
                            headers: myHeaders,
                            credentials: 'include'
                          })
                          console.log(request2);
                          fetch(request2)
                          .then(response => response.json())
                          .then(data => {
                            console.log(data); // Process the response data as needed
                          
                            // Parse serial and Edge loginPassword&enablePassword from the response
                            //const edgePass=data.passwordDetail
                            //for (var i = 0; i < venueGroups.length; i++) {
                            //var element2 = edgePassArray[i];
                            var api2EdgeSerial=edgeSerial
                            var api2loginPass=data.loginPassword
                            var api2enablePass=data.enablePassword
                            AppendEdgePasswordBySerial(api2EdgeSerial, api2loginPass, api2enablePass);
                            //console.log("id: " + api2VenueId + ", AP Pass: " + api2ApPassword);
                            //var matchVenueName = getVenueNameById(api2VenueId);
                            console.log('777:' + venueGroups)
                            console.log('test')
                            //}
                          })
                          .catch(error => {
                            console.log(error);
                          });
                        }

                        async function main() {
                          try {
                            await getEdgeList(request1);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            for (var i = 0; i < venueGroups.length; i++) {
                                var group = venueGroups[i];
                                const testEdgeSerial = group.serial
                                console.log(testEdgeSerial)
                                // Check if the group's id matches the given id
                                const apiUrlEdgeTest = 'https://' + testenv + '/api/edges/' + testEdgeSerial + '/passwordDetails';
                                // Return the user associated with the matching id
                                await getEdgePwd(apiUrlEdgeTest, testEdgeSerial);
                            }
                          
                            //await getEdgePwd(apiUrlEdgePass);

                            console.log('Both API requests completed successfully');
                            await new Promise(resolve => setTimeout(resolve, 1000));
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

                            const edgeGroups = venueGroups.map(item => ({
                              name: item.name,
                              loginPassword: item.loginPassword,
                              enablePassword: item.enablePassword,
                              serial: item.serial,
                            }));

                            var table = document.querySelector('#groupTable');
                            var headerRow = document.querySelector('#headerRow');
                            // Clear any existing content in the header row
                            headerRow.innerHTML = '';
                            // Get the keys of the first group object
                            var EdgeGroupKeys = Object.keys(edgeGroups[0]);

                            // Iterate over the keys and create table header cells
                            for (var i = 0; i < EdgeGroupKeys.length; i++) {
                                var key = EdgeGroupKeys[i];

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
                            for (var i = 0; i < edgeGroups.length; i++) {
                                var group = edgeGroups[i];
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
                                for (var j = 0; j < EdgeGroupKeys.length; j++) {
                                    var key = EdgeGroupKeys[j];

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
                        //feedBackForSessionStorage.innerHTML = `JWT Key: ${jwtString}` ;
                        //feedBackForSessionStorage.innerHTML =
                        //    'All the session storage values are retrieved123.'
                          } catch (error) {
                            console.log ('An error occurred:', error);
                          }
                        }
                        main();
                    }
                } catch (err) {
                    console.error(
                        'Error occured in injectionResults of getApPassBtn.addEventListener',
                        err
                    )
                }
            }
        )
      }
      )

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
                        const apiUrlVenue = 'https://' + testenv + '/api/tenant/' + testTenantId + '/venue';
                        //const apiUrl = 'https://api.dev.ruckus.cloud/api/tenant/' + testTenantId + '/wifi';
                        //console.log('apiUrl : ' + apiUrlWifi);
                        const myHeaders = new Headers();
                        const jwtToken = `Bearer ${jwtString}` 
                        myHeaders.append("Authorization", jwtToken);
                        myHeaders.append("Content-Type", 'application/json');
                        myHeaders.append("Accept", 'application/json, text/plain, */*');
                        //myHeaders.append("Origin", location.origin);
                        myHeaders.append("Access-Control-Allow-Origin", '*');
                        //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab
                        
                        const addVenueName = document.getElementById("addVenueName").value;
                        const messageElement = document.getElementById("addVenueResult");
                        const requestElement = document.getElementById("addVenueRequestId");

                        function displayMessageId(message, id, color) {
                            messageElement.textContent = message;
                            messageElement.style.color = color;
                            requestElement.textContent = 'Request ID: ' + id;
                            requestElement.style.color = color;
                        }

                        function displayMessage(message, color) {
                            messageElement.textContent = message;
                            messageElement.style.color = color;
                        }

                        const addVenuePayload = {
                            "name":addVenueName,
                            "address":{
                                "addressLine":"No. 45, City Hall Rd, Xinyi District, Taipei City, Taiwan 110",
                                "city":"Xinyi District, Taipei City",
                                "country":"Taiwan",
                                "latitude":25.0341222,"longitude":121.5604212,
                                "timezone":"Asia/Taipei"
                            }
                        };

                        const request2 = new Request(apiUrlVenue, {
                          method: "POST",
                          headers: myHeaders,
                          credentials: 'include',
                          body: JSON.stringify(addVenuePayload)
                        });
                        console.log(request2);

                        //fetch(request).then(resp => console.log(resp))
                        fetch(request2)
                        .then(response => {
                        //.then(response => response.json())
                        //.then(data => {
                          //console.log(data); // Process the response data as needed
                          // Parse id and apPassword from the response   
                          if (response.status === 202) {
                            response.json().then(responseData => {
                              if (responseData.requestId.length > 0) {
                                const successMessage = "Success"
                                const getRequestId =  responseData.requestId;
                                displayMessageId(successMessage, getRequestId, "green");
                              } else {
                                displayMessage("Success", "green");
                              }
                            });
                          } else if (response.status === 400 || response.status === 403) {
                            response.json().then(responseData => {
                              if (responseData.errors && responseData.errors.length > 0) {
                                const errorMessage = responseData.errors[0].message;
                                const getRequestId =  responseData.requestId;
                                displayMessageId(errorMessage, getRequestId, "red");
                              } else {
                                displayMessage("Unknown Error", "red");
                              }
                            }).catch(error => {
                              console.error("Error parsing response JSON:", error);
                              displayMessage("Unknown Error", "red");
                            });
                          } else {
                            displayMessage("Unknown Error", "red");
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

      queryApDrsBtn?.addEventListener('click', async () => {
        const Serial = document.getElementById("querySerial").value;
        const nonProdUrl = 'https://aprqa.ruckuswireless.com/api/v4/accesspoints/' + Serial;
        const ProdUrl = 'https://ap-registrar.ruckuswireless.com/api/v4/accesspoints/' + Serial
        
        const NonProdApElement = document.getElementById("NonProdApEnv");
        const NonProdApEnvElement = document.getElementById("QueryNonProdApEnv");
        const NonProdApTenantElement = document.getElementById("QueryNonProdApTenant");
        const ProdApElement = document.getElementById("ProdApEnv");
        const ProdApEnvElement = document.getElementById("QueryProdApEnv");
        const ProdApTenantElement = document.getElementById("QueryProdApTenant");

        function displayNonProdMessage(color, env, tenant) {
          NonProdApElement.textContent = 'Non Prod Env (dev / qa) Query:'
          NonProdApEnvElement.textContent = env;
          NonProdApTenantElement.textContent = tenant;
          NonProdApEnvElement.style.color = color;
          NonProdApTenantElement.style.color = color;
        }

        function displayProdMessage(color, env, tenant) {
          ProdApElement.textContent = 'Prod Env (stage / prod) Query:'
          ProdApEnvElement.textContent = env;
          ProdApTenantElement.textContent = tenant;
          ProdApEnvElement.style.color = color;
          ProdApTenantElement.style.color = color;
        }

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", 'application/json');
        myHeaders.append("Access-Control-Allow-Origin", '*');
        //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab

        const nonProdRequest = new Request(nonProdUrl, {
          method: "GET",
          headers: myHeaders,
          credentials: 'include'
        });
        console.log(nonProdRequest);

        //fetch(request).then(resp => console.log(resp))
        fetch(nonProdRequest)
        .then(response => {
          if (response.status === 200) {
            response.json().then(responseData => {
              if (responseData.tenant && responseData.tenant.length > 0) {
                const getNonProdEnv = 'Found AP in Env: ' + responseData.controller_address;
                const getNonProdTenant =  'Tenant ID: ' + responseData.tenant;
                displayNonProdMessage("green", getNonProdEnv, getNonProdTenant);
              } else {
                const getNonProdEnv = "Got 200 status code but no data";
                displayNonProdMessage("black", getNonProdEnv);
              }
            });
          } else if (response.status === 404 || response.status === 401) {
            response.json().then(responseData => {
              if (responseData.error && responseData.error.length > 0) {
                const getNonProdEnv = "Not found AP";
                const getNonProdTenant  = 'Response: ' + responseData.error;
                displayNonProdMessage("red", getNonProdEnv, getNonProdTenant)
              } else {
                const getNonProdEnv = "Got 40X status code but no data"
                displayNonProdMessage("orange", getNonProdEnv);
              }
            }).catch(error => {
              console.error("Error parsing response JSON:", error);
              const getNonProdEnv = "Unknown Error"
              displayNonProdMessage("orange", getNonProdEnv);
            });
          } else {
            const getNonProdEnv = "Unknown Error"
            displayNonProdMessage("orange", getNonProdEnv);
          }             
        })
        .catch(error => {
          console.log(error);
        });

        const ProdRequest = new Request(ProdUrl, {
          method: "GET",
          headers: myHeaders,
          credentials: 'include'
        });
        console.log(ProdRequest);

        //fetch(request).then(resp => console.log(resp))
        fetch(ProdRequest)
        .then(response => {
          if (response.status === 200) {
            response.json().then(responseData => {
              if (responseData.tenant && responseData.tenant.length > 0) {
                const getProdEnv = 'Found AP in Env: ' + responseData.controller_address;
                const getProdTenant =  'Tenant ID: ' + responseData.tenant;
                displayProdMessage("green", getProdEnv, getProdTenant);
              } else {
                const getProdEnv = "Got 200 status code but no data";
                displayProdMessage("black", getProdEnv);
              }
            });
          } else if (response.status === 404 || response.status === 401) {
            response.json().then(responseData => {
              if (responseData.error && responseData.error.length > 0) {
                const getProdEnv = "Not found AP";
                const getProdTenant  = 'Response: ' + responseData.error;
                displayProdMessage("red", getProdEnv, getProdTenant)
              } else {
                const getProdEnv = "Got 40X status code but no data"
                displayProdMessage("orange", getProdEnv);
              }
            }).catch(error => {
              console.error("Error parsing response JSON:", error);
              const getProdEnv = "Unknown Error"
              displayProdMessage("orange", getProdEnv);
            });
          } else {
            const getProdEnv = "Unknown Error"
            displayProdMessage("orange", getProdEnv);
          }             
        })
        .catch(error => {
          console.log(error);
        });

      })

      querySwitchDrsBtn?.addEventListener('click', async () => {
        const Serial = document.getElementById("querySerial").value;
        const nonProdUrl = 'https://aprqa.ruckuswireless.com/api/v4/switches/' + Serial;
        const ProdUrl = 'https://ap-registrar.ruckuswireless.com/api/v4/switches/' + Serial
        
        const NonProdApElement = document.getElementById("NonProdApEnv");
        const NonProdApEnvElement = document.getElementById("QueryNonProdApEnv");
        const NonProdApTenantElement = document.getElementById("QueryNonProdApTenant");
        const ProdApElement = document.getElementById("ProdApEnv");
        const ProdApEnvElement = document.getElementById("QueryProdApEnv");
        const ProdApTenantElement = document.getElementById("QueryProdApTenant");

        function displayNonProdMessage(color, env, tenant) {
          NonProdApElement.textContent = 'Non Prod Env (dev / qa) Query:'
          NonProdApEnvElement.textContent = env;
          NonProdApTenantElement.textContent = tenant;
          NonProdApEnvElement.style.color = color;
          NonProdApTenantElement.style.color = color;
        }

        function displayProdMessage(color, env, tenant) {
          ProdApElement.textContent = 'Prod Env (stage / prod) Query:'
          ProdApEnvElement.textContent = env;
          ProdApTenantElement.textContent = tenant;
          ProdApEnvElement.style.color = color;
          ProdApTenantElement.style.color = color;
        }

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", 'application/json');
        myHeaders.append("Access-Control-Allow-Origin", '*');
        //const jsessionId = document.cookie.match(/JSESSIONID=([^;]+)/); // Get the JSESSIONID cookie value from the current tab

        const nonProdRequest = new Request(nonProdUrl, {
          method: "GET",
          headers: myHeaders,
          credentials: 'include'
        });
        console.log(nonProdRequest);

        //fetch(request).then(resp => console.log(resp))
        fetch(nonProdRequest)
        .then(response => {
          if (response.status === 200) {
            response.json().then(responseData => {
              if (responseData.tenant && responseData.tenant.length > 0) {
                const getNonProdEnv = 'Found Switch in Env: ' + responseData.controller_address;
                const getNonProdTenant =  'Tenant ID: ' + responseData.tenant;
                displayNonProdMessage("green", getNonProdEnv, getNonProdTenant);
              } else {
                const getNonProdEnv = "Got 200 status code but no data";
                displayNonProdMessage("black", getNonProdEnv);
              }
            });
          } else if (response.status === 404 || response.status === 401) {
            response.json().then(responseData => {
              if (responseData.error && responseData.error.length > 0) {
                const getNonProdEnv = "Not found Switch, has data";
                const getNonProdTenant  = 'Response: ' + responseData.error;
                displayNonProdMessage("red", getNonProdEnv, getNonProdTenant)
              } else {
                const getNonProdEnv = "Got 40X status code but no data"
                displayNonProdMessage("orange", getNonProdEnv);
              }
            }).catch(error => {
              console.error("Error parsing response JSON:", error);
              const getNonProdEnv = "Not found Switch"
              displayNonProdMessage("orange", getNonProdEnv);
            });
          } else {
            const getNonProdEnv = "Not found Switch"
            displayNonProdMessage("orange", getNonProdEnv);
          }             
        })
        .catch(error => {
          console.log(error);
        });

        const ProdRequest = new Request(ProdUrl, {
          method: "GET",
          headers: myHeaders,
          credentials: 'include'
        });
        console.log(ProdRequest);

        //fetch(request).then(resp => console.log(resp))
        fetch(ProdRequest)
        .then(response => {
          if (response.status === 200) {
            response.json().then(responseData => {
              if (responseData.tenant && responseData.tenant.length > 0) {
                const getProdEnv = 'Found Switch in Env: ' + responseData.controller_address;
                const getProdTenant =  'Tenant ID: ' + responseData.tenant;
                displayProdMessage("green", getProdEnv, getProdTenant);
              } else {
                const getProdEnv = "Got 200 status code but no data";
                displayProdMessage("black", getProdEnv);
              }
            });
          } else if (response.status === 404 || response.status === 401) {
            response.json().then(responseData => {
              if (responseData.error && responseData.error.length > 0) {
                const getProdEnv = "Not found Switch, has data";
                const getProdTenant  = 'Response: ' + responseData.error;
                displayProdMessage("red", getProdEnv, getProdTenant)
              } else {
                const getProdEnv = "Got 40X status code but no data"
                displayProdMessage("orange", getProdEnv);
              }
            }).catch(error => {
              console.error("Error parsing response JSON:", error);
              const getProdEnv = "Not found Switch"
              displayProdMessage("orange", getProdEnv);
            });
          } else {
            const getProdEnv = "Unknown Error"
            displayProdMessage("orange", getProdEnv);
          }             
        })
        .catch(error => {
          console.log(error);
        });

      })


      /*
      <-----------Event Listeners End------------------------------------------------------>
      */
  } catch (err) {
      console.error('Error occured in global popup.js', err)
  }
})()