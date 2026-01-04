/**
 * @file listener.js
 * @update 2012/06/13 10:03
 * @author Paolo Rovelli
 * @version 1.6
 */



/** 
 * Defines the Email Security Plus NameSpace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/email.js");
Components.utils.import("resource://emailsecurityplus/scan.js");
Components.utils.import("resource://emailsecurityplus/overlay.js");


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
		if ( !emailHeader.isRead ) {  // new email received!!
			let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
			var email = new emailsecurityplus.Email(emailURI, emailHeader);

			/* --- BEGIN Whitelist control: --- */
			if ( emailsecurityplus.Preferences.isWhitelistActive() && !(emailsecurityplus.Preferences.getWhitelist().length == 1 && emailsecurityplus.Preferences.getWhitelist()[0] == "") ) {  // always receive emails from thrusted senders
				if ( emailsecurityplus.Scan.isInWhitelist(email.author) || emailsecurityplus.Scan.isInWhitelist(email.authorDomain) ) {  // the sender's email address or its domain is inside the Whitelist
					//Debug messages:
					//dump("> Whitelist: " + email.author + "\n");

					return;
				}
			}
			/* --- END Whitelist control. --- */


			/* --- BEGIN Blacklist control: --- */
			if ( emailsecurityplus.Preferences.isBlacklistActive() && !(emailsecurityplus.Preferences.getBlacklist().length == 1 && emailsecurityplus.Preferences.getBlacklist()[0] == "") ) {  // Blacklist active
				if ( emailsecurityplus.Scan.isInBlacklist(email.author) || emailsecurityplus.Scan.isInBlacklist(email.authorDomain) ) {  // the sender's email address or its domain is inside the Blacklist
					//Debug messages:
					//dump("> Blacklist: " + email.author + "\n");

					//Flag the email as Spam (junk):
					emailsecurityplus.Scan.markEmailAs(email, Components.interfaces.nsIJunkMailPlugin.JUNK, "100", "user");
					

					if( emailsecurityplus.Preferences.isDeleteBlacklistActive() ) {  // automatically delete emails from blocked senders
						//deleteJunkInFolder();  // Move junk emails in the Trash folder

						//Delete message:
						let trashFolder = email.folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
						let unwantedEmail = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
						unwantedEmail.appendElement(email.header, false /*weak*/);
						Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, unwantedEmail, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);  // Move unwanted email in the Trash folder
						
						//Debug messages:
						//dump("> Delete email: " + email.id + "\n");
						
						//Add the event in the Activity Manager:
						emailsecurityplus.Overlay.addActivityManagerEvent("deleteMail", "1 message deleted (Blacklist)", "Email Security Plus");
					}

					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 1);

					//Overlay the Statusbar label:
					document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
					
					return;
				}
			}
			/* --- END Blacklist control. --- */

			
			/* --- BEGIN AntiSpam and AntiHoax control: --- */
			isEmailAddressInAddressBooks = email.isEmailAddressInAddressBooks;
			if ( (emailsecurityplus.Preferences.isAntiSpamActive() && !isEmailAddressInAddressBooks) || (emailsecurityplus.Preferences.isAntiHoaxActive() && isEmailAddressInAddressBooks) ) {  // automatically scan incoming emails...
				var spamCounterLabel = null;
				
				if ( emailsecurityplus.Scan.scanEmail(email, false) ) {  // this email is Spam!
					if ( (emailsecurityplus.Preferences.isDeleteSpamActive() && !isEmailAddressInAddressBooks) || (emailsecurityplus.Preferences.isDeleteHoaxActive() && isEmailAddressInAddressBooks) ) {  // Automatically delete emails marked as junk...
						//deleteJunkInFolder();  // Move junk emails in the Trash folderv
					}
					else {
						//Add the event in the Activity Manager:
						emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "1 message scanned", "Email Security Plus");
					}
					
					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 1);
				}
				else {  // !emailsecurityplus.Scan.scanEmail(email, false)
					//Add the event in the Activity Manager:
					emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "1 message scanned", "Email Security Plus");

					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 0);
				}
				
				//Overlay the Statusbar label:
				document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
			}  // emailsecurityplus.Preferences.isScanActive()
			/* --- END AntiSpam and AntiHoax control. --- */
		}

		return;
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
		removeEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
		
		this.notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
		this.notificationService.addListener(this, this.notificationService.msgAdded);
		//this.notificationService.addListener(emailsecurityplus.NewEmailListener, this.notificationService.msgAdded);
	},
	
	
	/**
	 * Remove the listener.
	 * 
	 * @param emailHeader  the new email header.
	 */
	unload: function() {
		removeEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
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
	if ( topic == 'nsPref:changed' )
		this._callback(this._branch, data);
};


/**
 * Register the listener.
 * 
 * @param {boolean} trigger  if true triggers the registered function on registration, that is, when this method is called.
 */
emailsecurityplus.MozPrefListener.prototype.register = function(trigger) {
	this._branch.addObserver('', this, false);
	
	if ( trigger ) {
		let that = this;
		this._branch.getChildList('', {}).forEach( function(pref_leaf_name)	{ that._callback(that._branch, pref_leaf_name); } );
	}
};


/** 
 * Unregister the listener.
 */
emailsecurityplus.MozPrefListener.prototype.unregister = function() {
	if ( this._branch ) {
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
							case "antispam.active":  // extensions.emailsecurityplus.antispam.active was changed!
							case "antihoax.active":  // extensions.emailsecurityplus.antihoax.active was changed!
							case "whitelist.active":  // extensions.emailsecurityplus.whitelist.active was changed!
							case "blacklist.active":  // extensions.emailsecurityplus.blacklist.active was changed!
									if ( emailsecurityplus.Preferences.isAntiSpamActive() || emailsecurityplus.Preferences.isAntiHoaxActive() || (emailsecurityplus.Preferences.isWhitelistActive() && !(emailsecurityplus.Preferences.getWhitelist().length == 1 && emailsecurityplus.Preferences.getWhitelist()[0] == "")) || (emailsecurityplus.Preferences.isBlacklistActive() && !(emailsecurityplus.Preferences.getBlacklist().length == 1 && emailsecurityplus.Preferences.getBlacklist()[0] == "")) ) {  // automatically scans incoming emails
										//Launch the window listener:
										addEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
									}
									
									//TODO: when the 'automatic scan' preference has changed, it is needed to reboot Thunderbird!
								break;
						}
					});



emailsecurityplus.PreferencesListener.register(true);
//emailsecurityplus.PreferencesListener.unregister();
