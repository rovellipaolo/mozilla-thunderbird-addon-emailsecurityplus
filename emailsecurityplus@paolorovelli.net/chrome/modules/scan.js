/**
 * @file scan.js
 * @update 2012/03/28 19:38
 * @author Paolo Rovelli
 * @version 1.5
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
	scanWindow: null,
	
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
		if( gui == true ) {  // there is a GUI in which display the scan progress...
			this.scanWindow.document.getElementById("emailsecurityplus-ScanProgress").setAttribute("value", this.progressCounter);
			this.scanWindow.document.getElementById("emailsecurityplus-ScanEmail").setAttribute("value", email.folder.name + ":" + email.id);
			this.scanWindow.document.getElementById("emailsecurityplus-ScanEmailCounter").setAttribute("value", this.emailCounter);
			
			var emailSender = "unknown";
			if( email.isEmailAddressInAddressBooks ) {
				emailSender = "known";
			}
			this.scanWindow.document.getElementById("emailsecurityplus-EmailSender").setAttribute("value", emailSender);
			
			var blacklisted = "No";
			if( emailsecurityplus.Scan.isInBlacklist(email.author, email.authorDomain) ) {  // the sender's email address or its domain is inside the Blacklist
				blacklisted = "Yes";
			}
			this.scanWindow.document.getElementById("emailsecurityplus-BlacklistedStatus").setAttribute("value", blacklisted);
			
			//Adds Spam information from the "X-Spam-Status" message's header:
			this.scanWindow.document.getElementById("emailsecurityplus-XSpamScore").setAttribute("value", email.getXSpamScore + " / " + email.getXSpamRequired);
			this.scanWindow.document.getElementById("emailsecurityplus-XSpamRate").setAttribute("value", email.getXSpamRate);
		}
		
		if( email.checkSpam ) {
			this.spamCounter++;
			
			//Flag the email as Spam (junk):
			if( email.header.getStringProperty("junkscore") != Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE ) {  // the email is NOT flagged as Spam (junk)
				//goDoCommand("cmd_markAsJunk");
				email.header.setProperty("junkscore", Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE);  // IS_SPAM_SCORE = "100"
				email.header.setStringProperty("junkscoreorigin", "user");
			}		
			
			//Update the scan window:
			if( gui == true ) {  // there is a GUI in which display the scan progress...
				this.scanWindow.document.getElementById("emailsecurityplus-ScanSpamCounter").setAttribute("value", this.spamCounter);
				
				var spamScoreLabel = (email.spamScore * 100 / emailsecurityplus.Preferences.getSpamMinValue()).toPrecision(3);
				if( spamScoreLabel >= 100 ) {
					spamScoreLabel = "> 100%";
				}
				else {  // spamScore < 100
					spamScoreLabel = "~ " + spamScoreLabel + "%";
				}
				this.scanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", spamScoreLabel);
			}
			
			return true;
		}
		else {  // !email.checkSpam
			//Flag the email as NOT Spam (junk):
			if( email.header.getStringProperty("junkscore") == Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE ) {  // the email is flagged as Spam (junk)
				//goDoCommand("cmd_markAsNotJunk");
				email.header.setStringProperty("junkscore", "0");
				email.header.setStringProperty("junkscoreorigin", "user");
			}
			
			//Update the scan window:
			if( gui == true ) {  // there is a GUI in which display the scan progress...
				var spamScoreLabel = (email.spamScore * 100 / emailsecurityplus.Preferences.getSpamMinValue()).toPrecision(3);
				if( spamScoreLabel >= 100 ) {
					spamScoreLabel = "> 100%";
				}
				else {  // spamScore < 100
					spamScoreLabel = "~ " + spamScoreLabel + "%";
				}
				this.scanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", spamScoreLabel);
			}
			
			return false;
		}
	},
	
	
	/** 
	 * Defines if an email address is into the Blacklist or not.
	 * 
	 * @param authorEmailAddress  the email of the author of the message.
	 * @param authorEmailDomain  the email domain of the author of the message.
	 * @return  true if the email address or its domain is present inside the Blacklist, false otherwise.
	 */
	isInBlacklist: function(authorEmailAddress, authorEmailDomain) {
		for(i=0; i < emailsecurityplus.Preferences.getBlacklist().length; i++) {
			if( emailsecurityplus.Preferences.getBlacklist()[i].indexOf("@") == 0 ) {  // it is a domain
				if( authorEmailDomain == emailsecurityplus.Preferences.getBlacklist()[i] )
					return true;  // the email domain IS present inside the Blacklist!
			}
			else {  // emailsecurityplus.Preferences.getBlacklist()[i].indexOf("@") != 0  // it is an email address
				if( authorEmailAddress == emailsecurityplus.Preferences.getBlacklist()[i] )
					return true;  // the email address IS present inside the Blacklist!
			}
		}
		
		return false;  // the email address and its domain are NOT present inside the Blacklist!
	},



	/** 
	 * Add the senders's email address or domain to the Blacklist.
	 * 
	 * @param dom  true if it is an email domain, otherwise it is an email address.
	 */
	addToBlacklist: function(dom) {
		//URI of the displayed/selected emails:
		var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
		
		for each (let emailURI in selectedEmailURIs) {
			let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);  // email header from the email URI
			var email = new emailsecurityplus.Email(emailURI, emailHeader);
			
			if( dom ) {
				if( !isInBlacklist(email.authorDomain) ) {  // the sender's email domain is inside the Blacklist
					emailsecurityplus.Preferences.addToBlacklist( email.authorDomain );
				}
			}
			else {  // dom != true
				if( !isInBlacklist(email.author) ) {  // the sender's email address is inside the Blacklist
					emailsecurityplus.Preferences.addToBlacklist( email.author );
				}
			}
		}
	}
};
