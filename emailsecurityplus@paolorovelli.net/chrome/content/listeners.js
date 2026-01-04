/**
 * @file listener.js
 * @update 2012/05/29 15:34
 * @author Paolo Rovelli
 * @version 1.5
 */



/** 
 * Defines the Email Security Plus NameSpace.
 */
if( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");  // , emailsecurityplus
Components.utils.import("resource://emailsecurityplus/email.js");  // , emailsecurityplus
Components.utils.import("resource://emailsecurityplus/scan.js");  // , emailsecurityplus
Components.utils.import("resource://emailsecurityplus/overlay.js");  // , emailsecurityplus




/* --- BEGIN Watch for New Mail: --- */
/**
 * Defines the Email Security Plus new email listener class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.NewEmailListener = {
	notificationService: null,
	
	
	
	/**
	 * Watch for new email.
	 * 
	 * @param emailHeader  the new email header.
	 */
	msgAdded: function(emailHeader) {
		if( !emailHeader.isRead ) {
			let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
			var email = new emailsecurityplus.Email(emailURI, emailHeader);
			
			if( emailsecurityplus.Preferences.isBlacklistActive() && !(emailsecurityplus.Preferences.getBlacklist().length == 1 && emailsecurityplus.Preferences.getBlacklist()[0] == "") ) {  // automatically delete emails from blocked senders
				if( emailsecurityplus.Scan.isInBlacklist(email.author, email.authorDomain) ) {  // the sender's email address or its domain is inside the Blacklist
					let trashFolder = email.folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
					let unwantedEmail = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
					unwantedEmail.appendElement(email.header, false /*weak*/);
					Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, unwantedEmail, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move unwanted email in the Trash folder
					
					//Debug messages:
					//dump("> Delete email: " + email.id + "\n");
					
					//Add the event in the Activity Manager:
					emailsecurityplus.Overlay.addActivityManagerEvent("deleteMail", "1 message deleted (blacklisted sender)", "Email Security Plus");
					
					return;
				}
			}
			
			var friendSwitch = email.isEmailAddressInAddressBooks;
			
			/* --- BEGIN Selective Receive control: --- */
			if( emailsecurityplus.Preferences.isWhitelistActive() && !friendSwitch ) {  // Receive only emails from senders in Friends List (the sender email address is NOT in Address Books!)
				let trashFolder = email.folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
				let unwantedEmail = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
				unwantedEmail.appendElement(email.header, false /*weak*/);
				Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, unwantedEmail, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move unwanted email in the Trash folder
				
				//Debug messages:
				//dump("> Delete email: " + email.id + "\n");
				
				//Add the event in the Activity Manager:
				addActivityManagerEvent("deleteMail", "1 message deleted", "Email Security Plus");
				
				return;
			}  // emailsecurityplus.Preferences.isWhitelistActive() && !friendSwitch
			/* --- END Selective Receive control. --- */
			
			if( emailsecurityplus.Preferences.isScanActive() ) {  // automatically scan incoming emails
				var spamCounterLabel = null;
				
				/* --- BEGIN Friends List control: --- */
				if( emailsecurityplus.Preferences.isFriendsListActive() && friendSwitch ) {  // Do NOT automatically scan emails from senders that are in my Friends List (the sender email address is in Address Books)
					return;
				}  // emailsecurityplus.Preferences.isFriendsListActive() && friendSwitch
				/* --- END Friends List control. --- */
				
				if( emailsecurityplus.Scan.scanEmail(email) ) {  // this email is Spam!
					if( emailsecurityplus.Preferences.isDeleteSpamActive() ) {
						deleteJunkInFolder();  // Move junk emails in the Trash folder
					}
					
					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 1);
				}
				else {  // !emailsecurityplus.Scan.scanEmail(email)
					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 0);
				}
				
				//Overlay the Statusbar label:
				document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
				
				//Add the event in the Activity Manager:
				emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "1 message scanned", "Email Security Plus");
			}  // emailsecurityplus.Preferences.isScanActive()
		}
	},
	
	
	/**
	 * Add the listener.
	 * 
	 * @param emailHeader  the new email header.
	 */
	load: function() {
		//Overlay the Statusbar label:
		var spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(0, 0);
		document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
		
		//Avoid duplicate initialization:
		removeEventListener("load", emailsecurityplus.NewEmailListener.load, true);
		
		this.notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
		this.notificationService.addListener(emailsecurityplus.NewEmailListener, notificationService.msgAdded);
	},
	
	
	/**
	 * Remove the listener.
	 * 
	 * @param emailHeader  the new email header.
	 */
	unload: function() {
		removeEventListener("load", emailsecurityplus.NewEmailListener.load, true);
		this.notificationService.removeListener(this);
	}
};
/* --- END Watch for New Mail. --- */




/* --- BEGIN Mozilla Preferences Listener class: --- */
/** 
 * Defines the Mozilla preferences listener class.
 * 
 * @param {string} branch_name
 * @param {Function} callback  must have the following arguments: branch, pref_leaf_name
 */
emailsecurityplus.MozPrefListener = function(branch_name, callback) {
		//Keeping a reference to the observed preference branch or it will get garbage collected.
		let mozPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
		
		this._branch = mozPrefService.getBranch(branch_name);
		this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this._callback = callback;
};


// Mozilla Preferences listener methods:
/**
 * Observe.
 * 
 * @param subject
 * @param topic
 * @param data 
 */
emailsecurityplus.MozPrefListener.prototype.observe = function(subject, topic, data) {
	if( topic == 'nsPref:changed' )
		this._callback(this._branch, data);
};


/**
 * Register the listener.
 * 
 * @param {boolean} trigger  if true triggers the registered function on registration, that is, when this method is called.
 */
emailsecurityplus.MozPrefListener.prototype.register = function(trigger) {
	this._branch.addObserver('', this, false);
	
	if( trigger ) {
		let that = this;
		this._branch.getChildList('', {}).forEach( function(pref_leaf_name)	{ that._callback(that._branch, pref_leaf_name); } );
	}
};


/** 
 * Unregister the listener.
 */
emailsecurityplus.MozPrefListener.prototype.unregister = function() {
	if( this._branch ) {
		this._branch.removeObserver('', this);
	}
};
/* --- END Mozilla Preferences Listener class. --- */




/** 
 * Defines the Email Security Plus preferences listener object.
 */
emailsecurityplus.PreferencesListener = new emailsecurityplus.MozPrefListener("extensions.emailsecurityplus.", 
					function(branch, name) {
						switch (name) {
							case "scan":  // extensions.emailsecurityplus.scan was changed!
									if( emailsecurityplus.Preferences.isScanActive() ) {  // automatically scans incoming emails
										//Launch the window listener:
										//addEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
										addEventListener("load", emailsecurityplus.NewEmailListener.load, true);
									}
									
									//TODO: when the 'scan' preference has changed, it is needed to reboot Thunderbird!
								break;
								
							case "languages.english":  // extensions.emailsecurityplus.languages.english was changed!
									if( emailsecurityplus.Preferences.isEnglishLangActive() ) {  // English Spam words
										var url = "chrome://emailsecurityplus/content/spamEN";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamEN"  // the URL of the file to be read.
										let xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
										xhr.open("GET", url, false);  // performs the operation synchronously.
										xhr.send(null);
										var spamEN = JSON.parse(xhr.responseText).spamKeywords;
										
										emailsecurityplus.Preferences.spamKeywords[0] = emailsecurityplus.Preferences.spamKeywords[0].concat( spamEN[0] );  // ANONYMOUS sender
										emailsecurityplus.Preferences.spamKeywords[1] = emailsecurityplus.Preferences.spamKeywords[1].concat( spamEN[1] );  // KNOWN sender
									}
								break;
							
							case "languages.italian":  // extensions.emailsecurityplus.languages.italian was changed!
									if( emailsecurityplus.Preferences.isItalianLangActive() ) {  // Italian Spam words
										var url = "chrome://emailsecurityplus/content/spamIT";  // "chrome://emailsecurityplus@paolorovelli.net/content/spamIT"  // the URL of the file to be read.
										let xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
										xhr.open("GET", url, false);  // performs the operation synchronously.
										xhr.send(null);
										var spamIT = JSON.parse(xhr.responseText).spamKeywords;
										
										emailsecurityplus.Preferences.spamKeywords[0] = emailsecurityplus.Preferences.spamKeywords[0].concat( spamIT[0] );  // ANONYMOUS sender
										emailsecurityplus.Preferences.spamKeywords[1] = emailsecurityplus.Preferences.spamKeywords[1].concat( spamIT[1] );  // KNOWN sender
									}
								break;
								
							case "whitelist.active":  // extensions.emailsecurityplus.scan.selectivereceive was changed!
									if( !emailsecurityplus.Preferences.isScanActive() && emailsecurityplus.Preferences.isWhitelistActive() ) {  // not automatically scans incoming emails
										//Launch the window listener:
										//addEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
										addEventListener("load", emailsecurityplus.NewEmailListener.load, true);
										
										//TODO: when the 'whitelist.active' preference has changed, it is needed to reboot Thunderbird!
									}
								break;
								
							case "blacklist.active":  // extensions.emailsecurityplus.blacklist.active was changed!
									if( !emailsecurityplus.Preferences.isScanActive() && !emailsecurityplus.Preferences.isWhitelistActive() && emailsecurityplus.Preferences.isBlacklistActive() ) {  // not automatically scans incoming emails
										//Launch the window listener:
										//addEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
										addEventListener("load", emailsecurityplus.NewEmailListener.load, true);
									}
									
									//TODO: when the 'blacklist.active' preference has changed, it is needed to reboot Thunderbird!
								break;
						}
					});



emailsecurityplus.PreferencesListener.register(true);
//emailsecurityplus.PreferencesListener.unregister();
