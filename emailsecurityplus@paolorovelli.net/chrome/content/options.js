/**
 * @file options.js
 * @update 2012/03/22 18:02
 * @author Paolo Rovelli
 * @version 1.0
 */



let mozPreferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.emailsecurityplus.");    // nsIPrefBranch

function espCheckDependences() {  
	if( mozPreferences.getBoolPref("scan") ) {  // swap: true -> false
		//Disabling elements that depend from scan preference:
		window.document.getElementById('espScanFriendsList').setAttribute("disabled", "true");	
	}
	else {  // !mozPreferences.getBoolPref("scan")  // swap: false -> true
		//Enabling back elements by removing the "disabled" attribute:
		window.document.getElementById('espScanFriendsList').removeAttribute("disabled");
	}
}

function loadDependences() {  
	if( !mozPreferences.getBoolPref("scan") ) {  // does NOT automatically scan incoming emails
		//Disabling elements that depend from scan preference:
		window.document.getElementById('espScanFriendsList').setAttribute("disabled", "true");
	}
}

window.onload = loadDependences;
