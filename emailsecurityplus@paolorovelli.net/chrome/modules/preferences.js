/**
 * @file preferences.js
 * @update 2012/05/21 16:03
 * @author Paolo Rovelli
 */



var EXPORTED_SYMBOLS = ["emailsecurityplus"];


/** 
 * Defines the Email Security Plus NameSpace.
 */
if( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


/**
 * Email Security Plus preferences object literals.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.Preferences = {
	mozPrefBranch: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.emailsecurityplus."),  // nsIPrefBranch
	
	/**
	 * spamKeywords[spam:0/hoax:1][riga][key:0/value:1][colonna]
	 */
	spamKeywords: null,
	
	
	
	//Methods:
	
	/**
	 * Initialization of the words of Spam (spamWords).
	 */
	init: function() {
		/* --- BEGIN Spam matrix initialization: --- */
		var url = "chrome://emailsecurityplus/content/spam";  // "chrome://emailsecurityplus@paolorovelli.net/content/spam"  // the URL of the file to be read.
		let xhr = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
		xhr.open("GET", url, false);  // performs the operation synchronously.
		xhr.send(null);
		/**
		 * Spam matrix: spamKeywords[spam:0/hoax:1][riga][key:0/value:1][colonna]
		 */
		this.spamKeywords = JSON.parse(xhr.responseText).spamKeywords;
		
		//Adds the current year to the spam words:
		var date = new Date();
		var curYearSpam = [[date.getFullYear().toString()], [2]];
		this.spamKeywords[0].push( curYearSpam );  // ANONYMOUS sender
		var curYearHoax = [[date.getFullYear().toString()], [1]];
		this.spamKeywords[1].push( curYearHoax );  // KNOWN sender
		/* --- END Spam matrix initialization. --- */
	},
	
	
	/** 
	 * Gets if the automatic scan preference is active or not.
	 * 
	 * @return  true if the automatic scan preference is active, false otherwise.
	 */  
	isScanActive: function() {
		return this.mozPrefBranch.getBoolPref("scan");
	},
	
	
	/** 
	 * Gets the Spam minimum value.
	 * 
	 * @return  the Spam minimum value.
	 */
	getSpamMinValue: function() {
		return this.mozPrefBranch.getIntPref("scan.aggressiveness");
	},
	
	
	/** 
	 * Gets the found Spam counter.
	 * 
	 * @return  the found Spam counter.
	 */
	getSpamCounter: function() {
		return this.mozPrefBranch.getIntPref("scan.spam");
	},
	
	
	/** 
	 * Gets the scanned email counter.
	 * 
	 * @return  the scanned email counter.
	 */
	getEmailCounter: function() {
		return this.mozPrefBranch.getIntPref("scan.email");
	},
	
	
	/** 
	 * Gets if the Friends List preference is active or not.
	 * 
	 * @return  true if the Friends List preference is active, false otherwise.
	 */  
	isFriendsListActive: function() {
		return this.mozPrefBranch.getBoolPref("scan.friendslist");
	},
	
	
	/** 
	 * Gets if the delete Spam preference is active or not.
	 * 
	 * @return  true if the delete Spam preference is active, false otherwise.
	 */  
	isDeleteSpamActive: function() {
		return this.mozPrefBranch.getBoolPref("scan.delete");
	},
	
	
	/** 
	 * Gets if the whitelist preference is active or not.
	 * 
	 * @return  true if the whitelist preference is active, false otherwise.
	 */  
	isWhitelistActive: function() {
		return this.mozPrefBranch.getBoolPref("whitelist.active");
	},
	
	
	/** 
	 * Gets if the blacklist preference is active or not.
	 * 
	 * @return  true if the blacklist preference is active, false otherwise.
	 */  
	isBlacklistActive: function() {
		return this.mozPrefBranch.getBoolPref("blacklist.active");
	},
	
	
	/** 
	 * Gets if the italian language preference is active or not.
	 * 
	 * @return  true if the italian language preference is active, false otherwise.
	 */
	isItalianLangActive: function() {
		return this.mozPrefBranch.getBoolPref("languages.italian");
	},
	
	
	/** 
	 * Gets if the english language preference is active or not.
	 * 
	 * @return  true if the english language preference is active, false otherwise.
	 */
	isEnglishLangActive: function() {
		return this.mozPrefBranch.getBoolPref("languages.english");
	},
	
	
	/** 
	 * Gets the blacklist.
	 * 
	 * @return  the blacklist.
	 */
	getBlacklist: function() {
		return this.mozPrefBranch.getCharPref("blacklist").split("\n");
	},
	
	
	/** 
	 * Add the number of new Spam found to the Spam counter.
	 * 
	 * @param numToAdd the number of new Spam found.
	 */
	addToSpamCounter: function(numToAdd) {
		this.mozPrefBranch.setIntPref("scan.spam", this.getSpamCounter() + numToAdd);
	},
	
	
	/** 
	 * Add the number of new email scanned to the email counter.
	 * 
	 * @param numToAdd the number of new Spam found.
	 */
	addToEmailCounter: function(numToAdd) {
		this.mozPrefBranch.setIntPref("scan.email", this.getEmailCounter() + numToAdd);
	},
	
	
	/** 
	 * Add an email address or domain to the blacklist preference array.
	 * 
	 * @param itemToAdd  the email address or domain to be added to the blacklist preference array.
	 */  
	addToBlacklist: function(itemToAdd) {
		let blacklist = this.getBlacklist();
		
		if( blacklist.length == 1 && blacklist[0] == "" ) {
			blacklist = itemToAdd;
		}
		else {  // !(blacklist.length == 1 && blacklist[0] == "")
			blacklist += "\n" + itemToAdd;
		}
		
		this.mozPrefBranch.setCharPref("blacklist", blacklist.replace(/[^\S\r\n]/g, "").replace(/[,;]/g, ""));
	}
};



/**
 * Constructor.
 */
(function() { this.init(); }).apply(emailsecurityplus.Preferences);
