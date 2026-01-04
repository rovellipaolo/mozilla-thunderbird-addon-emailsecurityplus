/**
 * @file scan.js
 * @update 2012/03/28 19:38
 * @author Paolo Rovelli
 * @version 1.0
 */



let espScanWindow;
var scanEmailCounter = 0;  // the number of email that are scanned in the current scan
var scanSpamCounter = 0;  // the number of Spam email that are found in the current scan
var scanFolderCounter = 0;  // the number of folders that are scanned in the current scan
var scanProgressUnit = 0;

/* --- BEGIN Spam HashMap: --- */
let url = "chrome://emailsecurityplus/content/spam";  // "chrome://emailsecurityplus@paolorovelli.net/content/spam"  // the URL of the file to be read.
let xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
xhr.open("GET", url, false);  // performs the operation synchronously.
xhr.send(null);

/*
 * spam array ([sKey], [hKey])
 * sKey: array of the Spam KEYWORDS and SCORE (ANONYMOUS sender). [[["key1","key11", ...],[value1, value11, ...]], [["key2", ...], ["value2", ...]], [...]]
 * hKey: array of the Hoax KEYWORDS and SCORE (KNOWN sender). [[["key1","key11", ...],[value1, value11, ...]], [["key2", ...], ["value2", ...]], [...]]
*/
var spam = JSON.parse(xhr.responseText).spamKeywords;

//Adds the current year to the spam words:
var date = new Date();
var curYearSpam = [[date.getFullYear().toString()], [2]];
spam[0].push( curYearSpam );  // ANONYMOUS sender
var curYearHoax = [[date.getFullYear().toString()], [1]];
spam[1].push( curYearHoax );  // KNOWN sender
/* --- END Spam HashMap. --- */



/** 
 * Define the method of the scan button.
 * 
 * @author Paolo Rovelli
 */
var scanButton = {
	print: "Scanning...",
	
	/** 
	 * This method prints the scan result.
	 */
	scanResults: function(scanEmailCounter, scanSpamCounter) {
		var date = new Date();
		
		//Update the scan window:
		espScanWindow.document.getElementById("espScanStatus").setAttribute("value", "---");
		espScanWindow.document.getElementById("espScanTimeEnd").setAttribute("value", date.toLocaleString());
		espScanWindow.document.getElementById("espScanProgress").setAttribute("value", "100");
		espScanWindow.document.getElementById("espScanEmail").setAttribute("value", "");
		espScanWindow.document.getElementById("espScanFolderCounter").setAttribute("value", scanFolderCounter);
		//espScanWindow.document.getElementById("espScanEmailCounter").setAttribute("value", scanEmailCounter);
		//espScanWindow.document.getElementById("espScanSpamCounter").setAttribute("value", scanSpamCounter);
	},
	
	/** 
	 * This method defines the action of the scan toolbar button.
	 */
	scan: function() {
		scanEmailCounter = 0;
		scanSpamCounter = 0;
		scanFolderCounter = 1;
		scanProgressUnit = 0;
		
		espScanWindow = window.open('chrome://emailsecurityplus/content/scan.xul','','chrome=yes,resizable=yes,centerscreen');
		
		//Selected folders in the "folders tree":
		var selectedFolders = gFolderTreeView.getSelectedFolders();
		//Header of the displayed/selected emails:
		//var selectedEmails = gMessageDisplay.displayedMessage;
		//URI of the displayed/selected emails:
		var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
		
		if( selectedEmailURIs == null ) {  // No one email is selected...
			scanFolders(selectedFolders, true);
			scanFolderCounter = selectedFolders.length;
		}
		else {  // selectedEmailURIs != null  // At least one email is selected...
			scanEmails(selectedEmailURIs, true);
		}
		
		//Overlay the status-bar label:
		statusbarOverlay(scanEmailCounter, scanSpamCounter);
		
		//Update the scan window:
		this.scanResults();
		//Add the event in the Activity Manager:
		addActivityManagerEvent("indexMail", "Email Security Plus scan completed", "Spam: " + scanSpamCounter + "/" + scanEmailCounter);
	},
	
	/** 
	 * This method prints the source of the selected email.
	 */
	source: function() {
		// URI of the displayed/selected emails:
		var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
		
		if( selectedEmailURIs != null ) {  // At least one email is selected...
			//View message source:
			goDoCommand("cmd_viewPageSource");
		}  // selectedEmailURIs != null
	}
}



/** 
 * Scan all the emails in the selected folders.
 * 
 * @param folders  the folders to be scanned.
 * @param gui  true if there is a GUI in which display the scan progress, false otherwise..
 */
function scanFolders(folders, gui) {
	let spamList = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
	//let folderCount = selectedFolders.length;
	
	for each (let folder in folders) {
		let emails = folder.messages;
		let trashFolder = folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
		scanProgressUnit += 100 / folders.length;
		
		while( emails.hasMoreElements() ) {
			let emailHeader = emails.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
			let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
			
			var email = new Email(emailURI, emailHeader);
			
			if ( scanEmail(email, gui) )  // this email is Spam!
				spamList.appendElement(email.header, false /*weak*/);
		}
		
		if( esp.isDeleteSpamActive() ) {
			Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, spamList, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move emails flagged as Spam in the Trash folder
		}
		
		spamList.clear();
	}
	
	return;
}



/** 
 * Scan the displayed/selected emails.
 * 
 * @param emailURIs  the URIs of the emails to be scanned.
 * @param gui  true if there is a GUI in which display the scan progress, false otherwise..
 */
function scanEmails(emailURIs, gui) {
	for each (let emailURI in emailURIs) {
		let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);  // email header from the email URI
		scanProgressUnit += 100 / emailURIs.length;
		
		var email = new Email(emailURI, emailHeader);
		scanEmail(email, gui);
	}
	
	if( esp.isDeleteSpamActive() ) {
		deleteJunkInFolder();  // Move junk emails in the Trash folder
	}
	
	return;
}



/** 
 * Scan an email.
 * 
 * @param email  the email to be scanned (Email class).
 * @param gui  true if there is a GUI in which display the scan progress, false otherwise..
 */
function scanEmail(email, gui) {
	scanEmailCounter++;
	
	//Update the scan window:
	if( gui == true ) {  // there is a GUI in which display the scan progress...
		espScanWindow.document.getElementById("espScanProgress").setAttribute("value", scanProgressUnit);
		espScanWindow.document.getElementById("espScanEmail").setAttribute("value", email.folder.name + ":" + email.id);
		espScanWindow.document.getElementById("espScanEmailCounter").setAttribute("value", scanEmailCounter);
	}
	
	if( email.checkSpam() ) {
		scanSpamCounter++;
		
		//Flag the email as Spam (junk):
		if( email.header.getStringProperty("junkscore") != Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE ) {  // the email is NOT flagged as Spam (junk)
			//goDoCommand("cmd_markAsJunk");
			email.header.setProperty("junkscore", Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE);  // IS_SPAM_SCORE = "100"
			email.header.setStringProperty("junkscoreorigin", "user");
		}		
		
		//Update the scan window:
		if( gui == true ) {  // there is a GUI in which display the scan progress...
			espScanWindow.document.getElementById("espScanSpamCounter").setAttribute("value", scanSpamCounter);
		}
		
		return true;
	}
	else {  // !email.checkSpam()
		//Flag the email as NOT Spam (junk):
		if( email.header.getStringProperty("junkscore") == Components.interfaces.nsIJunkMailPlugin.IS_SPAM_SCORE ) {  // the email is flagged as Spam (junk)
			//goDoCommand("cmd_markAsNotJunk");
			email.header.setStringProperty("junkscore", "0");
			email.header.setStringProperty("junkscoreorigin", "user");
		}
		
		return false;
	}
}



/** 
 * Defines if an email address is into Address Books or not.
 * 
 * @param authorEmailAddress  the email of the author of the message.
 * @return  true if the email address is present inside the Address Books, false otherwise.
 */
function isEmailAddressInAddressBooks(authorEmailAddress) {
	let mozAbManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
	let mozAllAddressBooks = mozAbManager.directories;
	
	while( mozAllAddressBooks.hasMoreElements() ) {
		let addressBook = mozAllAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
		
		if( addressBook instanceof Components.interfaces.nsIAbDirectory ) {  // nsIAbItem or nsIAbCollection
			if( addressBook.cardForEmailAddress( authorEmailAddress ) != null ) {
				return true;  // the email address IS present inside the Address Book!
			}
		}
	}
	
	return false;  // the email address is NOT present inside the Address Book!
}


/** 
 * Extract the domain of the email from the email address.
 * 
 * @param authorEmailAddress  the email of the author of the message.
 * @return  the domain.
 */
function getDomain(authorEmailAddress) {
	return authorEmailAddress.substring( authorEmailAddress.indexOf("@") );
}



/** 
 * Defines if an email address is into the Blacklist or not.
 * 
 * @param authorEmailAddress  the email of the author of the message.
 * @return  true if the email address is present inside the Blacklist, false otherwise.
 */
function isInBlacklist(authorEmailAddress) {
	for(i=0; i < esp.blacklist.length; i++) {
		if( esp.blacklist[i].indexOf("@") == 0 ) {  // it is a domain
			//email.domain = getDomain(authorEmailAddress);
			
			if( getDomain(authorEmailAddress) == esp.blacklist[i] )
				return true;  // the email address IS present inside the Blacklist!
		}
		else {  // espBlacklist[i].indexOf("@") != "@"  // it is an email address
			if( authorEmailAddress == esp.blacklist[i] )
				return true;  // the email address IS present inside the Blacklist!
		}
	}
	
	return false;  // the email address is NOT present inside the Blacklist!
}



/** 
 * Add the senders's email address or domain to the Blacklist.
 * 
 * @param dom  true if the email address is present inside the Blacklist, false otherwise.
 */
function addToBlacklist(dom) {
	//URI of the displayed/selected emails:
	var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
	
	for each (let emailURI in selectedEmailURIs) {
		let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);  // email header from the email URI
		var email = new Email(emailURI, emailHeader);
		
		if( dom ) {
			email.domain = getDomain(email.author);
			
			if( !isInBlacklist(email.domain) ) {  // the sender's email address is inside the Blacklist
				esp.addToBlacklist( email.domain );
			}
		}
		else {  // dom != true
			if( !isInBlacklist(email.author) ) {  // the sender's email address is inside the Blacklist
				esp.addToBlacklist( email.author );
			}
		}
	}
}
