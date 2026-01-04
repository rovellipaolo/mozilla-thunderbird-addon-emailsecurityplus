/**
 * @file scan.js
 * @update 2012/06/18 23:52
 * @author Paolo Rovelli
 * @version 1.6
 */


var EXPORTED_SYMBOLS = ["emailsecurityplus"];


/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/email.js");


/** 
 * Defines the Email Security Plus scan class.
 */
emailsecurityplus.Scan = {
	emailCounter: 0,
	spamCounter: 0,
	folderCounter: 0,
	progressCounter: 0,
	
	scanFolders: function(folders, gui) {
		var isSpamFound = false;
		var spamList = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
		this.folderCount = folders.length;
		
		for each (let folder in folders) {
			let emails = folder.messages;
			this.progressCounter += 100 / folders.length;
			
			while ( emails.hasMoreElements() ) {
				let emailHeader = emails.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
				let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
				
				var email = new emailsecurityplus.Email(emailURI, emailHeader);
				
				if ( this.scanEmail(email, gui) ) {  // this email is Spam!
					isSpamFound = true;
					spamList.appendElement(email.header, false /*weak*/);
				}
			}
		}
		
		if ( isSpamFound )
			return spamList;
		else
			return null;
	},
	
	scanEmails: function(emailURIs, gui) {
		var isSpamFound = false;
		
		for each (let emailURI in emailURIs) {
			let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
			let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);
			this.progressCounter += 100 / emailURIs.length;
			
			var email = new emailsecurityplus.Email(emailURI, emailHeader);
			
			if ( this.scanEmail(email, gui) ) {  // this email is Spam!
				isSpamFound = true;
			}
		}
		
		return isSpamFound;
	},
	
	scanEmail: function(email, gui) {
		this.emailCounter++;
		
		// Update the scan window:
		if ( gui == true && emailsecurityplus.ScanWindow != null ) {
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanTimeEndLabel").setAttribute("style", "visibility: hidden;");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ProgressBox").setAttribute("value", this.progressCounter);
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmail").setAttribute("value", email.folder.name + ":" + email.id);
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmailCounter").setAttribute("value", this.emailCounter);
			
			var emailSenderInfo = email.author;
			if ( email.author != null ) {
				if ( !email.isEmailAddressInAddressBooks ) {
					emailSenderInfo += " [unknown]";
				}
				if ( emailsecurityplus.Scan.isInBlacklist(email.author) || emailsecurityplus.Scan.isInBlacklist(email.authorDomain) ) {  // the sender's email address or its domain is inside the Blacklist
					emailSenderInfo += " (blacklisted)";
				}
			}
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-EmailSender").setAttribute("value", emailSenderInfo);
			
			// Adds Spam information from the "Received" message's header:
			/**
			 * emailReceivedInfo[0]: from
			 * emailReceivedInfo[1]: by
			 */
			var emailReceivedInfo = Array(2);
			emailReceivedInfo[0] = "";  // Received From
			emailReceivedInfo[1] = "";  // Received By

			/**
			 * received[0]: from
			 * received[1]: IP (from)
			 * received[2]: by
			 * received[3]: IP (by)
			 */
			var received = email.getReceivedInfo;

			if ( received[0] != null ) {
				emailReceivedInfo[0] = received[0];
			}
			if ( received[1] != null ) {
				emailReceivedInfo[0] += " (" + received[1] + ")";
			}
			
			if ( received[2] != null ) {
				emailReceivedInfo[1] = received[2];
			}
			if ( received[3] != null ) {
				emailReceivedInfo[1] += " (" + received[3] + ")";
			}

			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ReceivedHeaderFrom").setAttribute("value", emailReceivedInfo[0]);
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ReceivedHeaderBy").setAttribute("value", emailReceivedInfo[1]);
			
			// Adds Spam information from the "X-Spam-Status" message's header:
			var xSpamScore = email.getXSpamScore;
			var xSpamRequired = email.getXSpamRequired
			if ( xSpamScore != "---" && xSpamRequired != "---" ) {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-XSpamStatus").setAttribute("value", xSpamScore + " / " + xSpamRequired);
			}
			else {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-XSpamStatus").setAttribute("value", "---");
			}
		}
		
		if ( email.checkSpam ) {
			this.spamCounter++;
			this.markEmailAs(email, Components.interfaces.nsIJunkMailPlugin.JUNK, "100", "user");
			
			// Update the scan window:
			if ( gui == true && emailsecurityplus.ScanWindow != null ) {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanSpamCounter").setAttribute("value", this.spamCounter);
				
				var spamScoreLabel = (email.spamScore * 100 / emailsecurityplus.Preferences.getSpamMinValue()).toPrecision(3);
				if ( spamScoreLabel >= 100 ) {
					spamScoreLabel = "> 100%";
				}
				else {
					spamScoreLabel = "~ " + spamScoreLabel + "%";
				}
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", spamScoreLabel);
			}
			
			return true;
		}
		else {
			this.markEmailAs(email, Components.interfaces.nsIJunkMailPlugin.GOOD, "0", "user");
			
			// Update the scan window:
			if ( gui == true && emailsecurityplus.ScanWindow != null ) {
				var spamScoreLabel = (email.spamScore * 100 / emailsecurityplus.Preferences.getSpamMinValue()).toPrecision(3);
				if ( spamScoreLabel >= 100 ) {
					spamScoreLabel = "> 100%";
				}
				else {
					spamScoreLabel = "~ " + spamScoreLabel + "%";
				}
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", spamScoreLabel);
			}
			
			return false;
		}
	},
	
	markEmailAs: function(email, classification, junkscore, junkscoreorigin) {
		let gJunkService = Components.classes["@mozilla.org/messenger/filter-plugin;1?name=bayesianfilter"].getService(Components.interfaces.nsIJunkMailPlugin);
		let oldJunkscore = email.header.getStringProperty("junkscore");
		let oldJunkscoreorigin = email.header.getStringProperty("junkscoreorigin");
		
		let oldClassification = Components.interfaces.nsIJunkMailPlugin.UNCLASSIFIED;
		if ( oldJunkscoreorigin == "user" ) {
			switch( oldJunkscore ) {
				case "0":
						oldClassification = Components.interfaces.nsIJunkMailPlugin.GOOD;
					break;
					
				case "100":
						oldClassification = Components.interfaces.nsIJunkMailPlugin.JUNK;
					break;
			}
		}
		
		// Set the message classification and origin:
		let db = email.folder.msgDatabase;
		db.setStringPropertyByHdr(email.header, "junkscore", junkscore);
		db.setStringPropertyByHdr(email.header, "junkscoreorigin", junkscoreorigin);
		
		if ( classification != oldClassification ) {
			gJunkService.setMessageClassification(email.uri, oldClassification, classification, null, null);
		}
	},
	
	isInBlacklist: function(author) {
		for (i=0; i < emailsecurityplus.Preferences.getBlacklist().length; i++) {
			if ( author == emailsecurityplus.Preferences.getBlacklist()[i] ) {
				return true;
			}
		}
		
		return false;
	},
	
	isInWhitelist: function(author) {
		for (i=0; i < emailsecurityplus.Preferences.getWhitelist().length; i++) {
			if ( author == emailsecurityplus.Preferences.getWhitelist()[i] ) {
				return true;
			}
		}
		
		return false;
	}
};
