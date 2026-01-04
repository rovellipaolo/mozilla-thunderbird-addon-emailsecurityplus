/**
 * @file buttons.js
 * @update 2012/06/18 23:52
 * @author Paolo Rovelli
 */



/** 
 * Defines the Email Security Plus NameSpace.
 */
if( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/scan.js");
Components.utils.import("resource://emailsecurityplus/overlay.js");


/** 
 * Defines the Email Security Plus scan window.
 */
emailsecurityplus.ScanWindow = null;


/** 
 * Defines the Email Security Plus buttons class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.Buttons = function() {
	emailsecurityplus.Scan.emailCounter = 0;  // the number of email that are scanned in the current scan
	emailsecurityplus.Scan.spamCounter = 0;  // the number of Spam email that are found in the current scan
	emailsecurityplus.Scan.folderCounter = 0;  // the number of folders that are scanned in the current scan
	emailsecurityplus.Scan.progressCounter = 0;  // the scanning percentage of the current scan
	
	
	
	/** 
	 * Define the methods of the buttons.
	 * 
	 * @author Paolo Rovelli
	 */
	var pub = {
		/** 
		 * Prints the scan result.
		 * 
		 * @param singleEmail  true if it is scanned a single email, false otherwise.
		 */
		scanResults: function(singleEmail) {
			var date = new Date();
			
			//Update the scan window:
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanStatus").setAttribute("value", "---");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanTimeEnd").setAttribute("value", date.toLocaleString());
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanTimeEndLabel").setAttribute("style", "visibility: visible;");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanProgress").setAttribute("value", "100");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanFolderCounter").setAttribute("value", emailsecurityplus.Scan.folderCounter);
			//emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmailCounter").setAttribute("value", emailsecurityplus.Scan.emailCounter);
			//emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanSpamCounter").setAttribute("value", emailsecurityplus.Scan.spamCounter);
			
			if( !singleEmail ) {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmail").setAttribute("value", "");
				
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-EmailSender").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ReceivedHeader").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-XSpamStatus").setAttribute("value", "---");
				//emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SecurityInfo").collapsed = true;
			}
			else {  // singleEmail
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanSummary").collapsed = true;
			}
		},
		
		
		/** 
		 * Defines the action of the scan toolbar button.
		 */
		scan: function() {
			var singleEmail = false;
			
			emailsecurityplus.Scan.emailCounter = 0;
			emailsecurityplus.Scan.spamCounter = 0;
			emailsecurityplus.Scan.folderCounter = 1;
			emailsecurityplus.Scan.progressCounter = 0;
			
			emailsecurityplus.ScanWindow = window.open('chrome://emailsecurityplus/content/scan.xul','','chrome=yes,resizable=yes,centerscreen');
			//emailsecurityplus.ScanWindow.onclose = this.closeScanWindow;
			emailsecurityplus.ScanWindow.onunload = this.closeScanWindow;
			
			//Selected folders in the "folders tree":
			var selectedFolders = gFolderTreeView.getSelectedFolders();
			//Header of the displayed/selected emails:
			//var selectedEmails = gMessageDisplay.displayedMessage;
			//URI of the displayed/selected emails:
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
			
			if( selectedEmailURIs == null ) {  // No one email is selected...
				//var spamList = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
				var spamList = emailsecurityplus.Scan.scanFolders(selectedFolders, true);
				emailsecurityplus.Scan.folderCounter = selectedFolders.length;
				
				if( emailsecurityplus.Preferences.isDeleteSpamActive() && spamList != null ) {
					let trashFolder = selectedFolders[0].rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
					Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(selectedFolders[0], spamList, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move emails flagged as Spam in the Trash folder
				}
				
				//spamList.clear();
				spamList = null;
			}
			else {  // selectedEmailURIs != null  // At least one email is selected...
				var isSpamFound = emailsecurityplus.Scan.scanEmails(selectedEmailURIs, true);
				
				if( emailsecurityplus.Preferences.isDeleteSpamActive() && isSpamFound ) {
					deleteJunkInFolder();  // Move junk emails in the Trash folder
				}
				
				if( selectedEmailURIs.length == 1 ) {
					singleEmail = true;
				}
			}
			
			//Overlay the Statusbar label:
			spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(emailsecurityplus.Scan.emailCounter, emailsecurityplus.Scan.spamCounter);
			document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
			
			//Update the scan window:
			this.scanResults(singleEmail);
			
			//Add the event in the Activity Manager:
			emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "Email Security Plus scan completed", "Spam: " + emailsecurityplus.Scan.spamCounter + "/" + emailsecurityplus.Scan.emailCounter);
		},
		
		
		/** 
		 * Defines the action when the scan window is closed.
		 */
		closeScanWindow: function() {
			if( emailsecurityplus.ScanWindow != null ) {
				if( emailsecurityplus.ScanWindow.closed ) {
					//emailsecurityplus.ScanWindow.close();
					emailsecurityplus.ScanWindow = null;
				}
			}
		},
		
		
		/** 
		 * Prints the source of the selected email.
		 */
		source: function() {
			// URI of the displayed/selected emails:
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
			
			if( selectedEmailURIs != null ) {  // At least one email is selected...
				//View message source:
				goDoCommand("cmd_viewPageSource");
			}  // selectedEmailURIs != null
		},
		
		
		/** 
		 * Adds the senders's email address or domain to the Blacklist.
		 * 
		 * @param dom  true if it is an email domain, otherwise it is an email address.
		 */
		addToBlacklist: function(dom) {
			if( typeof dom == 'undefined' ) {
				dom = false;
			}
			
			let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
			
			//URI of the displayed/selected emails:
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
			
			for each (let emailURI in selectedEmailURIs) {
				let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);  // email header from the email URI
				var email = new emailsecurityplus.Email(emailURI, emailHeader);
				
				if( dom ) {
					if( !emailsecurityplus.Scan.isInBlacklist(email.authorDomain) ) {  // the sender's email domain is inside the Blacklist
						emailsecurityplus.Preferences.addToBlacklist( email.authorDomain );
					}
				}
				else {  // dom != true
					if( !emailsecurityplus.Scan.isInBlacklist(email.author) ) {  // the sender's email address is inside the Blacklist
						emailsecurityplus.Preferences.addToBlacklist( email.author );
					}
				}
			}
		},
		
		
		/**
		 * Opens a new dialog.
		 * 
		 * @param url  the URL of the dialog.
		 */
		openWindow: function(url) {
			var alreadyOpen = false;
			let windowMediatorEnumerator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getEnumerator(null);
			
			while( windowMediatorEnumerator.hasMoreElements() ) {
				var openedWindow = windowMediatorEnumerator.getNext();
				try {
					if( openedWindow.location == url ) {
						alreadyOpen = true;
					}
				} catch(e) {}
			}
			
			//Check if the dialog is already open:
			if( !alreadyOpen ) {
				window.openDialog(url,'','');
			}
		}
	}  // pub
	
	return pub;
}();
