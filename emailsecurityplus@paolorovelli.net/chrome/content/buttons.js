/**
 * @file buttons.js
 * @update 2012/06/18 23:52
 * @author Paolo Rovelli
 */


/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) { var emailsecurityplus = {}; }


Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/scan.js");
Components.utils.import("resource://emailsecurityplus/overlay.js");


/** 
 * Defines the Email Security Plus scan window.
 */
emailsecurityplus.ScanWindow = null;

/** 
 * Defines the Email Security Plus buttons class.
 */
emailsecurityplus.Buttons = function() {
	emailsecurityplus.Scan.emailCounter = 0;     // the number of email that are scanned in the current scan
	emailsecurityplus.Scan.spamCounter = 0;      // the number of Spam email that are found in the current scan
	emailsecurityplus.Scan.folderCounter = 0;    // the number of folders that are scanned in the current scan
	emailsecurityplus.Scan.progressCounter = 0;  // the scanning percentage of the current scan
	
	var pub = {
		scanResults: function(singleEmail) {
			var date = new Date();
			
			// Update the scan window:
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanStatus").setAttribute("value", "---");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanTimeEnd").setAttribute("value", date.toLocaleString());
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanTimeEndLabel").setAttribute("style", "visibility: visible;");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ProgressBox").setAttribute("value", "100");
			emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanFolderCounter").setAttribute("value", emailsecurityplus.Scan.folderCounter);
			//emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmailCounter").setAttribute("value", emailsecurityplus.Scan.emailCounter);
			//emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanSpamCounter").setAttribute("value", emailsecurityplus.Scan.spamCounter);
			
			if ( !singleEmail ) {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanEmail").setAttribute("value", "");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-EmailSender").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SpamRate").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ReceivedHeaderFrom").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ReceivedHeaderBy").setAttribute("value", "---");
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-XSpamStatus").setAttribute("value", "---");
				//emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-SecurityInfo").collapsed = true;
			}
			else {
				emailsecurityplus.ScanWindow.document.getElementById("emailsecurityplus-ScanSummary").collapsed = true;
			}
		},
		
		scan: function() {
			var singleEmail = false;
			
			emailsecurityplus.Scan.emailCounter = 0;
			emailsecurityplus.Scan.spamCounter = 0;
			emailsecurityplus.Scan.folderCounter = 1;
			emailsecurityplus.Scan.progressCounter = 0;
			
			emailsecurityplus.ScanWindow = window.open('chrome://emailsecurityplus/content/scan.xul','','chrome=yes,resizable=yes,centerscreen');
			//emailsecurityplus.ScanWindow.onclose = this.closeScanWindow;
			emailsecurityplus.ScanWindow.onunload = this.closeScanWindow;
			
			var selectedFolders = gFolderTreeView.getSelectedFolders();
			//var selectedEmails = gMessageDisplay.displayedMessage;
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;

			if ( selectedEmailURIs == null ) {
				//var spamList = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
				var spamList = emailsecurityplus.Scan.scanFolders(selectedFolders, true);
				emailsecurityplus.Scan.folderCounter = selectedFolders.length;
				
				/*
				// Move messages flagged as Spam in the Trash folder:
				if ( (emailsecurityplus.Preferences.isDeleteSpamActive() || emailsecurityplus.Preferences.isDeleteHoaxActive()) && spamList != null ) {
					let trashFolder = selectedFolders[0].rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
					Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(selectedFolders[0], spamList, trashFolder, true, null, msgWindow, true);
				}
				*/
				
				//spamList.clear();
				spamList = null;
			}
			else {
				var isSpamFound = emailsecurityplus.Scan.scanEmails(selectedEmailURIs, true);
				
				/*
				// Move messages flagged as Spam in the Trash folder:
				if ( (emailsecurityplus.Preferences.isDeleteSpamActive() || emailsecurityplus.Preferences.isDeleteHoaxActive()) && isSpamFound ) {
					// Move messages flagged as Spam in the Trash folder:
					deleteJunkInFolder();
				}
				*/
				
				if ( selectedEmailURIs.length == 1 ) {
					singleEmail = true;
				}
			}
			
			// Overlay the Statusbar label:
			spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(emailsecurityplus.Scan.emailCounter, emailsecurityplus.Scan.spamCounter);
			document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
			
			// Update the scan window:
			this.scanResults(singleEmail);
			
			// Add the event in the Activity Manager:
			emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "Email Security Plus scan completed", "Spam: " + emailsecurityplus.Scan.spamCounter + "/" + emailsecurityplus.Scan.emailCounter);
		},
		
		closeScanWindow: function() {
			if ( emailsecurityplus.ScanWindow != null ) {
				if ( emailsecurityplus.ScanWindow.closed ) {
					//emailsecurityplus.ScanWindow.close();
					emailsecurityplus.ScanWindow = null;
				}
			}
		},
		
		source: function() {
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;

			if ( selectedEmailURIs != null ) {
				goDoCommand("cmd_viewPageSource");
			}
		},
		
		addToBlacklist: function(dom) {
			if ( typeof dom == 'undefined' ) {
				dom = false;
			}
			
			let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;

			for each (let emailURI in selectedEmailURIs) {
				let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);
				var email = new emailsecurityplus.Email(emailURI, emailHeader);
				
				if ( dom ) {
					if ( !emailsecurityplus.Scan.isInBlacklist(email.authorDomain) ) {
						emailsecurityplus.Preferences.addToBlacklist( email.authorDomain );
					}
				}
				else {
					if ( !emailsecurityplus.Scan.isInBlacklist(email.author) ) {
						emailsecurityplus.Preferences.addToBlacklist( email.author );
					}
				}
			}
		},
		
		addToWhitelist: function(dom) {
			if ( typeof dom == 'undefined' ) {
				dom = false;
			}
			
			let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
			var selectedEmailURIs = gFolderDisplay.selectedMessageUris;
			
			for each (let emailURI in selectedEmailURIs) {
				let emailHeader = messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI);
				var email = new emailsecurityplus.Email(emailURI, emailHeader);
				
				if ( dom ) {
					if ( !emailsecurityplus.Scan.isInWhitelist(email.authorDomain) ) {
						emailsecurityplus.Preferences.addToWhitelist( email.authorDomain );
					}
				}
				else {
					if ( !emailsecurityplus.Scan.isInWhitelist(email.author) ) {
						emailsecurityplus.Preferences.addToWhitelist( email.author );
					}
				}
			}
		},
		
		openWindow: function(url) {
			var alreadyOpen = false;
			let windowMediatorEnumerator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getEnumerator(null);
			
			while ( windowMediatorEnumerator.hasMoreElements() ) {
				var openedWindow = windowMediatorEnumerator.getNext();
				try {
					if ( openedWindow.location == url ) {
						alreadyOpen = true;
					}
				} catch (e) {}
			}
			
			if ( !alreadyOpen ) {
				window.openDialog(url,'','');
			}
		}
	}
	
	return pub;
}();
