'use strict';
//page action js
jQuery(document).ready(function () {

	$('.modal').modal();
	$('#loading').hide();
	if (localStorage.getItem('first_time_user') == "true" & localStorage.getItem('token_exist') == "true" & localStorage.getItem(localStorage.getItem('current_user')) != null & !localStorage.getItem('opened_extension')){
		$('#tutorial_popup').modal('open');
	}
	//no token
	if (localStorage.getItem('token_exist') == "false") {
		$('#dashboard').hide()
		$('#login').show()
		$('#create').hide()
		console.log('no')
	} else {
		//yes token, no sheet
		if (!localStorage.getItem(localStorage.getItem('current_user'))) {
			$('#login').hide()
			$('#dashboard').hide()
			$('#create').show()
			$('#sheet_iframe').hide()
			console.log("yes, no")
		}
		//yes token, yes sheet
		else {
			$('#login').hide()
			$('#dashboard').show()
			$('#create').hide()
			console.log("yes, yes")
		}
	}

	if (localStorage.getItem('first_time_user') == "true"){
		// send message to background script
		// chrome.runtime.sendMessage({ "newIconPath" : "src/Image/catswork-favicon.png" });
		$('#nav-mobile').hide();
	}

	if (localStorage.getItem(localStorage.getItem('current_user'))){
		$('#sheet_iframe').attr('src', ('https://docs.google.com/spreadsheets/d/' + localStorage.getItem(localStorage.getItem('current_user'))))
	}

	if (localStorage.getItem('optionArray')) {
		let optionArray = localStorage.getItem('optionArray').split(',')
		for (let i = 0; i < 14; ++i) {
			let name = '#option' + (i + 1)
			if (optionArray[i] == 'no') {
				$(name).prop('checked', false);
			}
		}
	}
})

// Authentication Functions
let authentication = (function () {
	let SCRIPT_ID = '1nPvptCpoQZKnaYCCzjs_dN4HldFucBUCpXJ9JYh0POK-cLPlenYP2KBT';
	let login_state = 2
	let signin_button, revoke_button, delete_button, setting_button, create_button;


	function getAuthToken(options) {
		chrome.identity.getAuthToken({
			'interactive': options.interactive
		}, options.callback);
	}

	function getAuthTokenSilent() {
		login_state = "silent"
		getAuthToken({

			'interactive': false,
			'callback': getAuthTokenCallback,
		});
	}

	function getAuthTokenInteractive() {
		login_state = "active"
		getAuthToken({
			'interactive': true,
			'callback': getAuthTokenCallback,
		});
	}

	function getAuthTokenCallback(token) {
		// Catch chrome error if user is not authorized.
		if (chrome.runtime.lastError) {
		} else {
			
			if (localStorage.getItem(localStorage.getItem('current_user'))) {
				$('#sheet_iframe').show()
			}
			if (login_state == "active")
			{	
				console.log('logged in');
				getUserEmail();
				localStorage.setItem('token_exist', true);
				Materialize.toast('Login successful!', 3000);
				createSheet();
				$('#loading').show()
				setTimeout(() => {
					window.location.reload()
				}, 3000);
			}
		}
	}

	function revokeToken() {
		getAuthToken({
			'interactive': false,
			'callback': revokeAuthTokenCallback,
		});
	}

	function revokeAuthTokenCallback(current_token) {
		if (!chrome.runtime.lastError) {

			// Remove the local cached token
			chrome.identity.removeCachedAuthToken({
				token: current_token
			}, function () {});

			// Make a request to revoke token in the server
			let xhr = new XMLHttpRequest();
			xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
				current_token);
			xhr.send();
			// Update the user interface accordingly
			$('#loading').show().delay(1000)
			$('#loading').hide(1000)
			$('#sheet_iframe').hide();
			$('#dashboard').hide()
			$('#login').show()
			$('#create').hide()
		}

	}

	/**
	 * Make an authenticated HTTP POST request.
	 *
	 * @param {object} options
	 *   @value {string} url - URL to make the request to. Must be whitelisted in manifest.json
	 *   @value {object} request - Execution API request object
	 *   @value {string} token - Google access_token to authenticate request with.
	 *   @value {function} callback - Function to receive response.
	 */
	function post(options) {
		let xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				// JSON response assumed. Other APIs may have different responses.
				options.callback(JSON.parse(xhr.responseText));
			} else if (xhr.readyState === 4 && xhr.status !== 200) {}
		};
		xhr.open('POST', options.url, true);
		// Set standard Google APIs authentication header.
		xhr.setRequestHeader('Authorization', 'Bearer ' + options.token);
		xhr.send(JSON.stringify(options.request));
	}

	function createSheet() {
		$('#loading').show()
		getAuthToken({
			'interactive': false,
			'callback': createSheetCallback,
		});
	}

	function createSheetCallback(token) {
		post({
			'url': 'https://script.googleapis.com/v1/scripts/' + SCRIPT_ID + ':run',
			'callback': createSheetResponse,
			'token': token,
			'request': {
				'function': 'createSheet',
			}
		});
	}

	function createSheetResponse(response) {
		if (response.response.result.status == 'ok') {
			console.log(response.response.result.user_email);
			console.log(response.response.result.id);
			localStorage.setItem(localStorage.getItem('current_user'), response.response.result.id);
			//localStorage.setItem('id', response.response.result.id);
			Materialize.toast("Sheet Creation successful!")
			setTimeout(() => {
				window.location.reload()
			}, 1000);
			
		}
	}

	function userSetting() {
		$('#loading').show(1000).delay(1000)
		$('#loading').hide(1000)
		getAuthToken({
			'interactive': false,
			'callback': userSettingCallback,
		});
	}

	function userSettingCallback(token) {
		let option_array = [];
		let inputs = document.getElementsByTagName('input');
		for (let index = 0; index < inputs.length; ++index) {
			if (inputs[index].getAttribute('id') && inputs[index].getAttribute('id').includes('option')) {
				if (inputs[index].checked == true) {
					option_array.push(inputs[index].value)
				} else {
					option_array.push("no")
				}
				localStorage.setItem('optionArray', option_array);
			}
		}

		post({
			'url': 'https://script.googleapis.com/v1/scripts/' + SCRIPT_ID + ':run',
			'callback': userSettingResponse,
			'token': token,
			'request': {
				'function': 'settingColumns',
				'parameters': {
					'option_array': option_array,
					'id': localStorage.getItem(localStorage.getItem('current_user'))
				}
			}
		});
	}

	function userSettingResponse(response) {
		console.log(response.response.result.status)
	}

	function deleteSheet() {
		getAuthToken({
			'interactive': false,
			'callback': deleteSheetCallback,
		});
	}

	function deleteSheetCallback(token) {
		post({
			'url': 'https://script.googleapis.com/v1/scripts/' + SCRIPT_ID + ':run',
			'callback': deleteSheetResponse,
			'token': token,
			'request': {
				'function': 'deleteSheet',
				'parameters': {
					'sheet_id': localStorage.getItem(localStorage.getItem('current_user'))
				}
			}
		});
	}

	function deleteSheetResponse(response) {
		if (response.response.result.status == 'ok') {
			Materialize.toast('Information deleted. Page reloading...', 3000);
			//localStorage.removeItem('url');
			localStorage.removeItem(localStorage.getItem('current_user'));
			localStorage.removeItem('optionArray');
			$('#loading').show()
			setTimeout(() => {
				window.location.reload()
			}, 1000);

		} else {
			Materialize.toast('Deletion Error. Please Try Again', 3000);
		}
	}

	function getUserEmail() {
		getAuthToken({
			'interactive': false,
			'callback': getUserEmailCallback,
		});
	}

	function getUserEmailCallback(token) {
		post({
			'url': 'https://script.googleapis.com/v1/scripts/' + SCRIPT_ID + ':run',
			'callback': getUserEmailResponse,
			'token': token,
			'request': {
				'function': 'getUserEmail',
			}
		});
	}

	function getUserEmailResponse(response) {
		if (response.response.result.status == 'ok') {
			console.log(response.response.result.user_email);
			localStorage.setItem('current_user', response.response.result.user_email)
		}
		else{
			console.log('getUserEmail Error')
			console.log(response.response.result.status)
		}
	}

	return {
		onload: function () {

			signin_button = document.querySelector('#signin');
			signin_button.addEventListener('click', getAuthTokenInteractive);

			revoke_button = document.querySelector('#revoke');
			revoke_button.addEventListener('click', revokeToken);
			revoke_button.addEventListener('click', function () {
				localStorage.setItem('token_exist', "false")
				localStorage.setItem('current_user', "")
			})

			delete_button = document.querySelector('#deletesheet')
			delete_button.addEventListener('click', deleteSheet)

			setting_button = document.querySelectorAll("input[id*='option']")
			console.log(setting_button)
			setting_button.forEach(function(x){
				x.addEventListener('click', userSetting)
			})

			create_button = document.querySelector('#createsheet')
			create_button.addEventListener('click', createSheet)

			// Trying to get access token without signing in, 
			// it will work if the application was previously 
			// authorized by the user.
			getAuthTokenSilent();
		}
	};
})();

window.onload = authentication.onload;