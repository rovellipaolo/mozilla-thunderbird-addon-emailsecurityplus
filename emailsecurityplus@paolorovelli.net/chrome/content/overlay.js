/**
 * @file overlay.js
 * @update 2012/03/28 17:32
 * @author Paolo Rovelli
 * @version 1.0
 */



//let mozPreferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.emailsecurityplus.");    // nsIPrefBranch
let espSpamCounter = mozPreferences.getIntPref("scan.spam");
let espEmailCounter = mozPreferences.getIntPref("scan.email");


/** 
 * Overlay the statusbar.
 * 
 * @param scanEmailCounter  the number of email scanned.
 * @param scanSpamCounter  the number of Spam found.
 */
function statusbarOverlay(scanEmailCounter, scanSpamCounter) {
	if( scanEmailCounter > 0 ) {
		espEmailCounter += scanEmailCounter;
		mozPreferences.setIntPref("scan.email", espEmailCounter);
	}
	
	if( scanSpamCounter > 0 ) {
		espSpamCounter += scanSpamCounter;
		mozPreferences.setIntPref("scan.spam", espSpamCounter);
	}
	
	statusbarLabel = "Spam: " + espSpamCounter + "/" + espEmailCounter;
	document.getElementById("emailSecurityPlus-Statusbar").setAttribute('label', statusbarLabel);
}


/** 
 * Add an event in the Activity Manager.
 * 
 * @param eventClass  the icon class of the new event in the Activity Manager.
 * @param eventTitle  the title of the new event in the Activity Manager.
 * @param eventDescription  the description of the new event in the Activity Manager.
 */
function addActivityManagerEvent(eventClass, eventTitle, eventDescription) {
	let mozActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
	let mozEvent = Components.classes["@mozilla.org/activity-event;1"].createInstance(Components.interfaces.nsIActivityEvent);
	
	mozEvent.iconClass = eventClass;
	mozEvent.init(eventTitle, null, eventDescription, null, Date.now());
	
	mozActivityManager.addActivity(mozEvent);
}
        

/** 
 * Open a new dialog.
 * 
 * @param url  the URL of the dialog.
 */
function openWindow(url) {
	var wmEnumerator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getEnumerator(null);
	
    //Check if the dialog is already open:
	var alreadyOpen = false;
	while (wmEnumerator.hasMoreElements()) {
		var Wind = wmEnumerator.getNext();
		try {
			if( Wind.location == url ) {
				alreadyOpen = true;
			}
		} catch(e) {}
	}
	if( !alreadyOpen ) {
		window.openDialog(url,'','');
	}
}
