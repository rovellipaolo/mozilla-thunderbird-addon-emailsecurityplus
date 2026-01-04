/**
 * @file listener.js
 * @update 2012/03/28 17:34
 * @author Paolo Rovelli
 * @version 1.0
 */



//let mozPreferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.emailsecurityplus.");    // nsIPrefBranch


/* --- BEGIN Watch for New Mail: --- */
 /** 
 * Define the method of the email listener.
 * 
 * @author Paolo Rovelli
 */
var emailListener = {
	/**
	 * Watch for new email.
	 * 
	 * @param emailHeader  the new email header.
	 */
	msgAdded: function(emailHeader) {
		if( !emailHeader.isRead ) {
			let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
			var email = new Email(emailURI, emailHeader);
			
			if( esp.isBlacklistActive() && !(esp.blacklist.length == 1 && esp.blacklist[0] == "") ) {  // automatically delete emails from blocked senders
				if( isInBlacklist(email.author) ) {  // the sender's email address is inside the Blacklist
					let trashFolder = email.folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
					let unwantedEmail = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
					unwantedEmail.appendElement(email.header, false /*weak*/);
					Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, unwantedEmail, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move unwanted email in the Trash folder
					
					//Debug messages:
					dump("> Delete email: " + email.id + "\n");
					
					//Add the event in the Activity Manager:
					addActivityManagerEvent("deleteMail", "1 message deleted", "Email Security Plus");
					
					return;
				}
			}
			
			var friendSwitch = isEmailAddressInAddressBooks(email.author);
			
			/* --- BEGIN Selective Receive control: --- */
			if( esp.isWhitelistActive() && !friendSwitch ) {  // Receive only emails from senders in Friends List (the sender email address is NOT in Address Books!)
				let trashFolder = email.folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
				let unwantedEmail = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
				unwantedEmail.appendElement(email.header, false /*weak*/);
				Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, unwantedEmail, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move unwanted email in the Trash folder
				
				//Debug messages:
				dump("> Delete email: " + email.id + "\n");
				
				//Add the event in the Activity Manager:
				addActivityManagerEvent("deleteMail", "1 message deleted", "Email Security Plus");
				
				return;
			}  // esp.isWhitelistActive() && !friendSwitch
			/* --- END Selective Receive control. --- */
			
			if( esp.isScanActive() ) {  // automatically scan incoming emails
				/* --- BEGIN Friends List control: --- */
				if( esp.isFriendsListActive() && friendSwitch ) {  // Do NOT automatically scan emails from senders that are in my Friends List (the sender email address is in Address Books)
					return;
				}  // esp.isFriendsListActive() && friendSwitch
				/* --- END Friends List control. --- */
				
				if( scanEmail(email) ) {  // this email is Spam!
					if( esp.isDeleteSpamActive() ) {
						deleteJunkInFolder();
					}
					
					//Overlay the status-bar label:
					statusbarOverlay(1, 1);
				}
				else {  // !scanEmail(email)
					statusbarOverlay(1, 0);
				}
				
				//Add the event in the Activity Manager:
				addActivityManagerEvent("indexMail", "1 message scanned", "Email Security Plus");
			}  // esp.isScanActive()
		}
	},
	
	/**
	 * Add the listener.
	 * 
	 * @param emailHeader  the new email header.
	 */
	load: function() {
		statusbarOverlay(0, 0);
		
		//Avoid duplicate initialization:
		removeEventListener("load", emailListener.load, true);
		
		this.notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
		this.notificationService.addListener(emailListener, notificationService.msgAdded);
	},
	
	/**
	 * Remove the listener.
	 * 
	 * @param emailHeader  the new email header.
	 */
	unload: function() {
		removeEventListener("load", emailListener.load, true);
		this.notificationService.removeListener(this);
	}
};
/* --- END Watch for New Mail. --- */


/* --- BEGIN Preferences Listener: --- */
/** 
 * Define the listener.
 * 
 * @param {string} branch_name  
 * @param {Function} callback  must have the following arguments: branch, pref_leaf_name 
 */
function mozPrefListener(branch_name, callback) {
	//Keeping a reference to the observed preference branch or it will get garbage collected.
	let mozPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
	this._branch = mozPrefService.getBranch(branch_name);
	this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
	this._callback = callback;
}

// Listener methods:
/** 
 * Observe.
 * 
 * @param subject  
 * @param topic  
 * @param data  
 */
mozPrefListener.prototype.observe = function(subject, topic, data) {
	if (topic == 'nsPref:changed')  
		this._callback(this._branch, data);  
};
/** 
 * Register the listener.
 * 
 * @param {boolean} trigger  if true triggers the registered function on registration, that is, when this method is called. 
 */
mozPrefListener.prototype.register = function(trigger) {
	this._branch.addObserver('', this, false);  
	if (trigger) {  
		let that = this;  
		this._branch.getChildList('', {}).forEach(function (pref_leaf_name)	{ that._callback(that._branch, pref_leaf_name); });
	}  
};
/** 
 * Unregister the listener.
 */
mozPrefListener.prototype.unregister = function() {
	if (this._branch)
		this._branch.removeObserver('', this);
};



let preferencesListener = new mozPrefListener("extensions.emailsecurityplus.", 
									function(branch, name) {
										switch (name) {
											case "scan":  // extensions.emailsecurityplus.scan was changed!
													esp.updateScanActive();
													
													if( esp.isScanActive() ) {  // automatically scans incoming emails
														//Launch the window listener:
														addEventListener("load", emailListener.load, true);
													}
													//TODO: when the 'scan' preference has changed, it is needed to reboot Thunderbird!
												break;
												
											case "scan.friendslist":  // extensions.emailsecurityplus.scan.friendslist was changed!
													esp.updateFriendsList();
												break;
												
											case "scan.selectivereceive":  // extensions.emailsecurityplus.scan.selectivereceive was changed!
													esp.updateWhitelistActive();
													
													if( !esp.isScanActive() && esp.isWhitelistActive() ) {  // not automatically scans incoming emails
														//Launch the window listener:
														addEventListener("load", emailListener.load, true);
													}
												break;
												
											case "scan.delete":  // extensions.emailsecurityplus.scan.delete was changed!
													esp.updateDeleteSpam();
												break;
												
											case "scan.aggressiveness":  // extensions.emailsecurityplus.scan.aggressiveness was changed!
													esp.updateSpamMinValue();
												break;
												
											case "languages.english":  // extensions.emailsecurityplus.languages.english was changed!
													if( mozPreferences.getBoolPref("languages.english") ) {  // English Spam words
														url = "chrome://emailsecurityplus/content/spamEN";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamEN"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamEN = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamEN[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamEN[1] );  // KNOWN sender
													}
												break;
											
											case "languages.bulgarian":  // extensions.emailsecurityplus.languages.bulgarian was changed!
													if( mozPreferences.getBoolPref("languages.bulgarian") ) {  // Bulgarian Spam words
														url = "chrome://emailsecurityplus/content/spamBG";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamBG"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamBG = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamBG[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamBG[1] );  // KNOWN sender
													}
												break;
											
											case "languages.chinese":  // extensions.emailsecurityplus.languages.chinese was changed!
													if( mozPreferences.getBoolPref("languages.chinese") ) {  // Chinese Spam words
														url = "chrome://emailsecurityplus/content/spamCN";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamCN"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamCN = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamCN[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamCN[1] );  // KNOWN sender
													}
												break;
											
											case "languages.french":  // extensions.emailsecurityplus.languages.french was changed!
													if( mozPreferences.getBoolPref("languages.french") ) {  // France Spam words
														url = "chrome://emailsecurityplus/content/spamFR";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamFR"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamFR = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamFR[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamFR[1] );  // KNOWN sender
													}
												break;
											
											case "languages.german":  // extensions.emailsecurityplus.languages.german was changed!
													if( mozPreferences.getBoolPref("languages.german") ) {  // German Spam words
														url = "chrome://emailsecurityplus/content/spamDE";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamDE"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamDE = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamDE[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamDE[1] );  // KNOWN sender
													}
												break;
											
											case "languages.hindi":  // extensions.emailsecurityplus.languages.hindi was changed!
													if( mozPreferences.getBoolPref("languages.hindi") ) {  // Hindi Spam words
														url = "chrome://emailsecurityplus/content/spamHI";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamHI"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamHI = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamHI[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamHI[1] );  // KNOWN sender
													}
												break;
											
											case "languages.icelandic":  // extensions.emailsecurityplus.languages.icelandic was changed!
													if( mozPreferences.getBoolPref("languages.icelandic") ) {  // Icelandic Spam words
														url = "chrome://emailsecurityplus/content/spamIS";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamIS"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamIS = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamIS[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamIS[1] );  // KNOWN sender
													}
												break;
											
											case "languages.italian":  // extensions.emailsecurityplus.languages.italian was changed!
													if( mozPreferences.getBoolPref("languages.italian") ) {  // Italian Spam words
														url = "chrome://emailsecurityplus/content/spamIT";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamIT"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamIT = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamIT[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamIT[1] );  // KNOWN sender
													}
												break;
											
											case "languages.japanese":  // extensions.emailsecurityplus.languages.japanese was changed!
													if( mozPreferences.getBoolPref("languages.japanese") ) {  // Japanese Spam words
														url = "chrome://emailsecurityplus/content/spamJP";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamJP"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamJP = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamJP[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamJP[1] );  // KNOWN sender
													}
												break;
												
											case "languages.portuguese":  // extensions.emailsecurityplus.languages.portuguese was changed!
													if( mozPreferences.getBoolPref("languages.portuguese") ) {  // Portuguese Spam words
														url = "chrome://emailsecurityplus/content/spamPT";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamPT"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamPT = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamPT[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamPT[1] );  // KNOWN sender
													}
												break;
												
											case "languages.russian":  // extensions.emailsecurityplus.languages.russian was changed!
													if( mozPreferences.getBoolPref("languages.russian") ) {  // Russian Spam words
														url = "chrome://emailsecurityplus/content/spamRU";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamRU"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamRU = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamRU[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamRU[1] );  // KNOWN sender
													}
												break;
												
											case "languages.spanish":  // extensions.emailsecurityplus.languages.spanish was changed!
													if( mozPreferences.getBoolPref("languages.spanish") ) {  // Spanish Spam words
														url = "chrome://emailsecurityplus/content/spamES";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamES"  // the URL of the file to be read.
														xhr.open("GET", url, false);  // performs the operation synchronously.
														xhr.send(null);
														var spamES = JSON.parse(xhr.responseText).spamKeywords;
														
														spam[0] = spam[0].concat( spamES[0] );  // ANONYMOUS sender
														spam[1] = spam[1].concat( spamES[1] );  // KNOWN sender
													}
												break;
												
											case "blacklist.active":  // extensions.emailsecurityplus.blacklist.active was changed!
													esp.updateBlacklistActive();
													
													if( !esp.isScanActive() && !esp.isWhitelistActive() && esp.isBlacklistActive() ) {  // not automatically scans incoming emails
														//Launch the window listener:
														addEventListener("load", emailListener.load, true);
													}
												break;
												
											case "blacklist":  // extensions.emailsecurityplus.blacklist was changed!
													esp.updateBlacklist();
												break;
										}
									});
preferencesListener.register(true);
//preferencesListener.unregister();
/* --- END Preferences Listener. --- */
