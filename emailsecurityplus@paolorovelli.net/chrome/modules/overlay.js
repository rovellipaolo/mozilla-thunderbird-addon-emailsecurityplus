/**
 * @file overlay.js
 * @update 2012/03/29 15:02
 * @author Paolo Rovelli
 */



var EXPORTED_SYMBOLS = ["emailsecurityplus"];


/** 
 * Defines the Email Security Plus NameSpace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");


/** 
 * Defines the Email Security Plus overlay class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.Overlay = {
	/**
	 * Overlay the statusbar.
	 * 
	 * @param emailCounter  the number of email scanned.
	 * @param spamCounter  the number of Spam found.
	 * @return  the formatted Spam counter label [SpamFoundPercentage (spamTotalCounter/emailTotalCounter)].
	 */
	statusbarOverlay: function(emailCounter, spamCounter) {
		if ( emailCounter > 0 ) {
			emailsecurityplus.Preferences.addToEmailCounter(emailCounter);
		}
		
		if ( spamCounter > 0 ) {
			emailsecurityplus.Preferences.addToSpamCounter(spamCounter);
		}
		
		var emailTotCounter = emailsecurityplus.Preferences.getEmailCounter();
		var spamTotCounter = emailsecurityplus.Preferences.getSpamCounter();
		var spamPercentage = (spamTotCounter * 100 / emailTotCounter).toPrecision(3);  // Math.round( (spamTotCounter * 100) / emailTotCounter );  // round a number to the nearest integer
		var spamCounterLabel = "Spam: ~" + spamPercentage + "% (" + spamTotCounter + "/" + emailTotCounter + ")";
		
		//Overlay the statusbar label:
		//document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
		
		return spamCounterLabel;
	},
	
	
	/**
	 * Adds an event in the Activity Manager.
	 * 
	 * @param eventClass  the icon class of the new event in the Activity Manager.
	 * @param eventTitle  the title of the new event in the Activity Manager.
	 * @param eventDescription  the description of the new event in the Activity Manager.
	 */
	addActivityManagerEvent: function(eventClass, eventTitle, eventDescription) {
		let mozActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
		let mozEvent = Components.classes["@mozilla.org/activity-event;1"].createInstance(Components.interfaces.nsIActivityEvent);
		
		mozEvent.iconClass = eventClass;
		mozEvent.init(eventTitle, null, eventDescription, null, Date.now());
		
		mozActivityManager.addActivity(mozEvent);
	}
};
