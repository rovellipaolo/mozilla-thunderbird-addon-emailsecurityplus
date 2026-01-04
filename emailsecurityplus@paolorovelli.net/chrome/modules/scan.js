/**
 * @file scan.js
 * @update 2012/06/18 23:52
 * @author Paolo Rovelli
 * @version 1.6
 */



var EXPORTED_SYMBOLS = ["emailsecurityplus"];


/** 
 * Defines the Email Security Plus NameSpace.
 */
if( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/email.js");


/** 
 * Defines the Email Security Plus scan class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.Scan = {
	emailCounter: 0,
	spamCounter: 0,
	folderCounter: 0,
	progressCounter: 0,
	
	
	
	//Methods:
		
	/** 
	 * Scans all the emails in the selected folders.
	 * 
	 * @param folders  the folders to be scanned.
	 * @param gui  true if there is a GUI in which display the scan progress, false otherwise.
	 * @return  the array (nsIMutableArray) of the email of Spam if at least one is Spam, false otherwise.
	 */
	scanFolders: function(folders, gui) {
		var isSpamFound = false;
		var spamList = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
		this.folderCount = folders.length;
		
		for each (let folder in folders) {
			let emails = folder.messages;
			this.progressCounter += 100 / folders.length;
			
			while( emails.hasMoreElements() ) {
				let emailHeader = emails.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
				let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
				
				var email = new emailsecurityplus.Email(emailURI, emailHeader);
				
				if ( this.scanEmail(email, gui) ) {  // this email is Spam!
					isSpamFound = true;
					spamList.appendElement(email.header, false /*weak*/);
				}
			}
		}
		
		if( isSpamFound )
			return spamList;
		else
			return null;
	},
	
	
	/** 
	 * Scans the displayed/selected emails.
	 * 
	 * @param emailURIs  the URIs of the emails to be scanned.
	 * @param gui  true if there is a GUI in which display the scan progress, false otherwise.
	 * @return  true if at least one email is Spam, false otherwise.
	 */
	scanEmails: function(emailURIs, gui) {
		var isSpamFound = false;
		
		for each (let emailURI in emailURIs) {
			let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
			let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);  // email header from the email URI
			this.progressCounter += 100 / emailURIs.length;
			
			var email = new emailsecurityplus.Email(emailURI, emailHeader);
			
			if( this.scanEmail(email, gui) ) {  // this email is Spam!
				isSpamFound = true;
			}
		}
		
		return isSpamFound;
	},



	/** 
	 * Scan an email.
	 * 
	 * @param email  the email to be scanned (Email class).
	 * @param gui  true if there is a GUI in which display the scan progress, false otherwise.
	 * @return  true if the email is Spam, false otherwise.
	 */
	scanEmail: function(email, gui) {
		this.emailCounter++;
		
		//Update the scan window:
		if( gui == true && emailsecurityplus.ScanWindow != null ) {  // there is a GUI in which display the scan progress...
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanTimeEndLabel").setAttribute("style", "visibility: hidden;");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanProgress").setAttribute("value", this.progressCounter);
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmail").setAttribute("value", email.folder.name + ":" + email.id);
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmailCounter").setAttribute("value", this.emailCounter);
			
			var emailSenderInfo = email.author;
			if( email.author != null ) {
				if( !email.isEmailAddressInAddressBooks ) {
					emailSenderInfo += " [unknown]";
				}
				if( emailsecurityplus.Scan.isInBlacklist(email.author) || emailsecurityplus.Scan.isInBlacklist(email.authorDomain) ) {  // the sender's email address or its domain is inside the Blacklist
					emailSenderInfo += " (blacklisted)";
				}
			}  // email.author != null
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-EmailSender").setAttribute("value", emailSenderInfo);
			
			//Adds Spam information from the "Received" message's header:
			var emailReceivedInfo = "";
			/**
			 * received[0]: from
			 * received[1]: IP (from)
			 * received[2]: by
			 * received[3]: IP (by)
			 */
			var received = email.getReceivedInfo;
			if( received[0] != null ) {
				emailReceivedInfo = "from " + received[0] + " ";
			}
			if( received[1] != null ) {
				emailReceivedInfo += "(" + received[1] + ") ";
			}
			if( received[2] != null ) {
				emailReceivedInfo += "by " + received[2];
			}
			if( received[3] != null ) {
				emailReceivedInfo += " (" + received[3] + ")";
			}
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ReceivedHeader").setAttribute("value", emailReceivedInfo);
			
			//Adds Spam information from the "X-Spam-Status" message's header:
			var xSpamScore = email.getXSpamScore;
			var xSpamRequired = email.getXSpamRequired
			if( xSpamScore != "---" && xSpamRequired != "---" ) {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-XSpamStatus").setAttribute("value", xSpamScore + " / " + xSpamRequired);
			}
			else {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-XSpamStatus").setAttribute("value", "---");
			}
		}
		
		if( email.checkSpam ) {
			this.spamCounter++;
			
			//Flag the email as Spam (junk):
			this.markEmailAs(email, Components.interfaces.nsIJunkMailPlugin.JUNK, "100", "user");
			
			//Update the scan window:
			if( gui == true && emailsecurityplus.ScanWindow != null ) {  // there is a GUI in which display the scan progress...
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanSpamCounter").setAttribute("value", this.spamCounter);
				
				var spamScoreLabel = (email.spamScore * 100 / emailsecurityplus.Preferences.getSpamMinValue()).toPrecision(3);
				if( spamScoreLabel >= 100 ) {
					spamScoreLabel = "> 100%";
				}
				else {  // spamScore < 100
					spamScoreLabel = "~ " + spamScoreLabel + "%";
				}
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", spamScoreLabel);
			}
			
			return true;
		}
		else {  // !email.checkSpam
			//Flag the email as NOT Spam (junk):
			this.markEmailAs(email, Components.interfaces.nsIJunkMailPlugin.GOOD, "0", "user");
			
			//Update the scan window:
			if( gui == true && emailsecurityplus.ScanWindow != null ) {  // there is a GUI in which display the scan progress...
				var spamScoreLabel = (email.spamScore * 100 / emailsecurityplus.Preferences.getSpamMinValue()).toPrecision(3);
				if( spamScoreLabel >= 100 ) {
					spamScoreLabel = "> 100%";
				}
				else {  // spamScore < 100
					spamScoreLabel = "~ " + spamScoreLabel + "%";
				}
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", spamScoreLabel);
			}
			
			return false;
		}
	},



	/** 
	 * Marks an email as Junk or Not Junk.
	 * 
	 * @param email  the email to be marked (Email class).
	 * @param classification  the new message classification (0:UNCLASSIFIED, 1:GOOD, 2:JUNK).
	 * @param junkscore  the new message junk score ("0":GOOD, "100":JUNK).
	 * @param junkscoreorigin  the new message junk score ("user", "filter", ...).
	 */
	markEmailAs: function(email, classification, junkscore, junkscoreorigin) {
		let gJunkService = Components.classes["@mozilla.org/messenger/filter-plugin;1?name=bayesianfilter"].getService(Components.interfaces.nsIJunkMailPlugin);
		let oldJunkscore = email.header.getStringProperty("junkscore");
		let oldJunkscoreorigin = email.header.getStringProperty("junkscoreorigin");
		
		let oldClassification = Components.interfaces.nsIJunkMailPlugin.UNCLASSIFIED;
		if( oldJunkscoreorigin == "user" ) {
			switch( oldJunkscore ) {
				case "0":
						oldClassification = Components.interfaces.nsIJunkMailPlugin.GOOD;
					break;
					
				case "100":
						oldClassification = Components.interfaces.nsIJunkMailPlugin.JUNK;
					break;
			}
		}
		
		//Set the message classification and origin:
		let db = email.folder.msgDatabase;
		db.setStringPropertyByHdr(email.header, "junkscore", junkscore);
		db.setStringPropertyByHdr(email.header, "junkscoreorigin", junkscoreorigin);
		
		if( classification != oldClassification ) {
			gJunkService.setMessageClassification(email.uri, oldClassification, classification, null, null);
		}
	},
	
	
	/** 
	 * Defines if an email address or an email domain is into the Blacklist or not.
	 * 
	 * @param author  the email address or domain of the author of the message.
	 * @return  true if the email address or its domain is present inside the Blacklist, false otherwise.
	 */
	isInBlacklist: function(author) {
		for(i=0; i < emailsecurityplus.Preferences.getBlacklist().length; i++) {
			if( author == emailsecurityplus.Preferences.getBlacklist()[i] ) {
				return true;  // the email domain IS present inside the Blacklist!
			}
		}
		
		return false;  // the email address and its domain are NOT present inside the Blacklist!
	}
};
