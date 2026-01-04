/**
 * @file options.js
 * @update 2012/05/29 15:48
 * @author Paolo Rovelli
 */



/** 
 * Defines the Email Security Plus NameSpace.
 */
if( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");  // , emailsecurityplus


/**
 * Defines the Email Security Plus options class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.Options = {
	/**
	 * Checks dependences.
	 */
	checkDependences: function() {
		if( emailsecurityplus.Preferences.isScanActive() ) {  // swap: true -> false
			//Disabling elements that depend from scan preference:
			window.document.getElementById('emailsecurityplus-ScanFriendsList').setAttribute("disabled", "true");	
		}
		else {  // !emailsecurityplus.Preferences.isScanActive()  // swap: false -> true
			//Enabling back elements by removing the "disabled" attribute:
			window.document.getElementById('emailsecurityplus-ScanFriendsList').removeAttribute("disabled");
		}
	},
	
	
	/**
	 * Loads dependences.
	 */
	loadDependences: function() {
		if( !emailsecurityplus.Preferences.isScanActive() ) {  // does NOT automatically scan incoming emails
			//Disabling elements that depend from scan preference:
			window.document.getElementById('emailsecurityplus-ScanFriendsList').setAttribute("disabled", "true");
		}
	}
};


window.onload = emailsecurityplus.Options.loadDependences;
