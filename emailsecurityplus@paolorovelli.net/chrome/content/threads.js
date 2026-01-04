/**
 * @file threads.js
 * @update 2012/05/30 14:21
 * @author Paolo Rovelli
 */


/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


/**
 * Defines the Email Security Plus column handler class.
 */
emailsecurityplus.columnHandler = {
	// From nsITreeView:

	getCellProperties: function(row, col, props) {},
	
	getRowProperties: function(row, props) {},
	
	getImageSrc: function(row, col) {
		let emailHeader = gDBView.db.GetMsgHdrForKey( gDBView.getKeyAt(row) );
		var spamStatus = emailHeader.getStringProperty("x-spam-status");
		
		if ( spamStatus != null && spamStatus != "" ) {
			var scorePos = spamStatus.indexOf("score=");
			var requiredPos = spamStatus.indexOf("required=");
			
			if ( scorePos < 0 ) {
				scorePos = spamStatus.indexOf(" hits=");
			}
			
			if ( scorePos >= 0 && requiredPos >= 0 ) {
				var xSpamScore = spamStatus.slice(scorePos + 6).slice(0,  spamStatus.indexOf(" "));
				var xSpamRequired = spamStatus.slice(requiredPos + 9).slice(0,  spamStatus.indexOf(" "));
				var xSpamRate = null;
				
				//dump("> X-Spam-Score: " + xSpamScore + " (" + xSpamRequired + ")\n");
				
				if ( xSpamScore < 0 )
					xSpamScore = 0;
				
				xSpamRate = Math.round( (xSpamScore * 100) / xSpamRequired );
				
				if ( xSpamRate >= 75 ) {
					return "chrome://emailsecurityplus/skin/spamLevelHigh.png";
				}
				else
					if ( xSpamRate >= 50 ) {
						return "chrome://emailsecurityplus/skin/spamLevelMed.png";
					}
					else
						return "chrome://emailsecurityplus/skin/spamLevelLow.png";
			}
		}
		
		return null;
	},
	
	getCellText: function(row, col) { return ""; },
	
	// From nsIMsgCustomColumnHandler (extends nsITreeView):
	
	getSortStringForRow: function(hdr) { return null; },
	
	getSortLongForRow: function(hdr) {
		var spamStatus = hdr.getStringProperty("x-spam-status");
		
		if ( spamStatus != null && spamStatus != "" ) {
			var scorePos = spamStatus.indexOf("score=");
			var requiredPos = spamStatus.indexOf("required=");
			
			if ( scorePos < 0 ) {
				scorePos = spamStatus.indexOf(" hits=");
			}
			
			if ( scorePos >= 0 && requiredPos >= 0 ) {
				var xSpamScore = spamStatus.slice(scorePos + 6).slice(0,  spamStatus.indexOf(" "));
				var xSpamRequired = spamStatus.slice(requiredPos + 9).slice(0,  spamStatus.indexOf(" "));
				
				//dump("> X-Spam-Score: " + xSpamScore + " (" + xSpamRequired + ")\n");
				
				if ( xSpamScore < 0 )
					xSpamScore = 0;
				
				return Math.round( (xSpamScore * 100) / xSpamRequired );
			}
		}
		
		return 0;
	},
	
	isString: function() { return false; }
};


/**
 * Defines the Email Security Plus tree column class.
 */
emailsecurityplus.TreeCol = {
	load: function() {
		let mozObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		mozObserverService.addObserver(emailsecurityplus.TreeCol.CreateDbObserver, "MsgCreateDBView", false);
		//window.document.getElementById('folderTree').addEventListener("select", addCustomColumnHandler, false);
	},
	
	CreateDbObserver: {
		// Components.interfaces.nsIObserver:
		
		observe: function(aMsgFolder, aTopic, aData)
		{  
			emailsecurityplus.TreeCol.addCustomColumnHandler();
		}
	},
	
	addCustomColumnHandler: function() {
		gDBView.addColumnHandler("emailsecurityplus-SpamLevelCol", emailsecurityplus.columnHandler);
	}
};


/**
 * Defines the Email Security Plus custom headers class.
 */
emailsecurityplus.CustomHeaders = function() {
	let mozPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var xHeader = "x-spam-status";
	
	let customHeaders = mozPrefs.getCharPref("mailnews.customHeaders");
	customHeaders = customHeaders.replace(/\s+/g, '');
	
	var customHeadersArray = new Array();
	if ( customHeaders != "" ) {
		customHeadersArray = customHeaders.split(":");
	}
	
	var ctrl = false;
	for (var i=0; i < customHeadersArray.length; i++) {
		if ( customHeadersArray[i] == xHeader ) {
			ctrl = true;
		}
	}
	
	if ( !ctrl ) {
		customHeadersArray.push( xHeader );
		var newCustomHeaders = customHeadersArray.join(": ");
		
		mozPrefs.setCharPref("mailnews.customHeaders", newCustomHeaders);
	}
	
	let customDBHeaders = mozPrefs.getCharPref("mailnews.customDBHeaders");
    customDBHeaders = customDBHeaders.replace(/\s+/g, ' ');
	
	var customDBHeadersArray = new Array();
	if ( customDBHeaders != "" ) {
		customDBHeadersArray = customDBHeaders.split(" ");
	}
	
	ctrl = false;
	for (var i=0; i < customDBHeadersArray.length; i++) {
		if ( customDBHeadersArray[i] == xHeader ) {
			ctrl = true;
		}
	}
	
	if ( !ctrl ) {
		customDBHeadersArray.push( xHeader );
		var newCustomDBHeaders = customDBHeadersArray.join(" ");
		
		mozPrefs.setCharPref("mailnews.customDBHeaders", newCustomDBHeaders);
	}
}();


window.addEventListener("load", function() { emailsecurityplus.TreeCol.load(); }, false);
