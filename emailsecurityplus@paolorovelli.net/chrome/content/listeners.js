/**
 * @file listener.js
 * @update 2012/06/13 10:03
 * @author Paolo Rovelli
 * @version 1.6
 */


/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) { var emailsecurityplus = {}; }


Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/email.js");
Components.utils.import("resource://emailsecurityplus/scan.js");
Components.utils.import("resource://emailsecurityplus/overlay.js");


/* --- BEGIN Watch for new emails: --- */
/**
 * Defines the Email Security Plus new email listener class.
 */
emailsecurityplus.NewEmailListener = {
	notificationService: null,
	
	msgAdded: function(emailHeader) {
		if ( !emailHeader.isRead ) {  // new message received!
			let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
			var email = new emailsecurityplus.Email(emailURI, emailHeader);

			/* --- BEGIN Whitelist control: --- */
			if ( emailsecurityplus.Preferences.isWhitelistActive() && !(emailsecurityplus.Preferences.getWhitelist().length == 1 && emailsecurityplus.Preferences.getWhitelist()[0] == "") ) {
				if ( emailsecurityplus.Scan.isInWhitelist(email.author) || emailsecurityplus.Scan.isInWhitelist(email.authorDomain) ) {
					//dump("> Whitelist: " + email.author + "\n");
					return;
				}
			}
			/* --- END Whitelist control. --- */

			/* --- BEGIN Blacklist control: --- */
			if ( emailsecurityplus.Preferences.isBlacklistActive() && !(emailsecurityplus.Preferences.getBlacklist().length == 1 && emailsecurityplus.Preferences.getBlacklist()[0] == "") ) {
				if ( emailsecurityplus.Scan.isInBlacklist(email.author) || emailsecurityplus.Scan.isInBlacklist(email.authorDomain) ) {
					//dump("> Blacklist: " + email.author + "\n");
					emailsecurityplus.Scan.markEmailAs(email, Components.interfaces.nsIJunkMailPlugin.JUNK, "100", "user");					

					if ( emailsecurityplus.Preferences.isDeleteBlacklistActive() ) {
						// Move messages flagged as Spam in the Trash folder:
						//deleteJunkInFolder();
						let trashFolder = email.folder.rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
						let unwantedEmail = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
						unwantedEmail.appendElement(email.header, false /*weak*/);
						Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService).CopyMessages(email.folder, unwantedEmail, trashFolder, true /*isMove*/, null, msgWindow, true /*allowUndo*/);
						//dump("> Delete email: " + email.id + "\n");
						
						// Add the event in the Activity Manager:
						emailsecurityplus.Overlay.addActivityManagerEvent("deleteMail", "1 message deleted (Blacklist)", "Email Security Plus");
					}

					// Overlay the Statusbar label:
					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 1);
					document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
					
					return;
				}
			}
			/* --- END Blacklist control. --- */
			
			/* --- BEGIN AntiSpam and AntiHoax control: --- */
			isEmailAddressInAddressBooks = email.isEmailAddressInAddressBooks;
			if ( (emailsecurityplus.Preferences.isAntiSpamActive() && !isEmailAddressInAddressBooks) || (emailsecurityplus.Preferences.isAntiHoaxActive() && isEmailAddressInAddressBooks) ) {
				var spamCounterLabel = null;
				
				if ( emailsecurityplus.Scan.scanEmail(email, false) ) {
					if ( (emailsecurityplus.Preferences.isDeleteSpamActive() && !isEmailAddressInAddressBooks) || (emailsecurityplus.Preferences.isDeleteHoaxActive() && isEmailAddressInAddressBooks) ) {
						// Move messages flagged as Spam in the Trash folder:
						//deleteJunkInFolder();
					}
					else {
						emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "1 message scanned", "Email Security Plus");
					}
					
					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 1);
				}
				else {
					// Add the event in the Activity Manager:
					emailsecurityplus.Overlay.addActivityManagerEvent("indexMail", "1 message scanned", "Email Security Plus");

					spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(1, 0);
				}
				
				// Overlay the Statusbar label:
				document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
			}
			/* --- END AntiSpam and AntiHoax control. --- */
		}

		return;
	},
	
	load: function() {
		// Overlay the Statusbar label:
		var spamCounterLabel = emailsecurityplus.Overlay.statusbarOverlay(0, 0);
		document.getElementById("emailsecurityplus-SpamCounterStat").setAttribute('label', spamCounterLabel);
		
		// Avoid duplicate initialization:
		removeEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
		
		this.notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
		this.notificationService.addListener(this, this.notificationService.msgAdded);
		//this.notificationService.addListener(emailsecurityplus.NewEmailListener, this.notificationService.msgAdded);
	},
	
	unload: function() {
		removeEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
		this.notificationService.removeListener(this);
	}
};
/* --- END Watch for new emails. --- */


/* --- BEGIN Mozilla Preferences Listener class: --- */
/** 
 * Defines the Mozilla preferences listener class.
 */
emailsecurityplus.MozPrefListener = function(branch_name, callback) {
		// Keeping a reference to the observed preference branch or it will get garbage collected:
		let mozPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
		
		this._branch = mozPrefService.getBranch(branch_name);
		this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this._callback = callback;
};

emailsecurityplus.MozPrefListener.prototype.observe = function(subject, topic, data) {
	if ( topic == 'nsPref:changed' )
		this._callback(this._branch, data);
};

emailsecurityplus.MozPrefListener.prototype.register = function(trigger) {
	this._branch.addObserver('', this, false);
	
	if ( trigger ) {
		let that = this;
		this._branch.getChildList('', {}).forEach( function(pref_leaf_name)	{ that._callback(that._branch, pref_leaf_name); } );
	}
};

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
							case "antispam.active":   // extensions.emailsecurityplus.antispam.active was changed!
							case "antihoax.active":   // extensions.emailsecurityplus.antihoax.active was changed!
							case "whitelist.active":  // extensions.emailsecurityplus.whitelist.active was changed!
							case "blacklist.active":  // extensions.emailsecurityplus.blacklist.active was changed!
									if ( emailsecurityplus.Preferences.isAntiSpamActive() || emailsecurityplus.Preferences.isAntiHoaxActive() || (emailsecurityplus.Preferences.isWhitelistActive() && !(emailsecurityplus.Preferences.getWhitelist().length == 1 && emailsecurityplus.Preferences.getWhitelist()[0] == "")) || (emailsecurityplus.Preferences.isBlacklistActive() && !(emailsecurityplus.Preferences.getBlacklist().length == 1 && emailsecurityplus.Preferences.getBlacklist()[0] == "")) ) {
										addEventListener("load", function() { emailsecurityplus.NewEmailListener.load(); }, true);
									}
									// TODO: when the 'automatic scan' preference has changed, it is needed to reboot Thunderbird!
								break;
						}
					});

emailsecurityplus.PreferencesListener.register(true);
//emailsecurityplus.PreferencesListener.unregister();
