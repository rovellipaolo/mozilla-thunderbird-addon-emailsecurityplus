/**
 * @file preferences.js
 * @update 2012/05/21 16:03
 * @author Paolo Rovelli
 */


var EXPORTED_SYMBOLS = ["emailsecurityplus"];


/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


/**
 * Email Security Plus preferences object literals.
 */
emailsecurityplus.Preferences = {
	mozPrefBranch: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.emailsecurityplus."),
	
	getSpamCounter: function() {
		return this.mozPrefBranch.getIntPref("scan.spam");
	},
	
	getEmailCounter: function() {
		return this.mozPrefBranch.getIntPref("scan.email");
	},
	
	isAntiSpamActive: function() {
		return this.mozPrefBranch.getBoolPref("antispam.active");
	},
	
	isAntiHoaxActive: function() {
		return this.mozPrefBranch.getBoolPref("antihoax.active");
	},
	
	isBlacklistActive: function() {
		return this.mozPrefBranch.getBoolPref("blacklist.active");
	},
	
	isWhitelistActive: function() {
		return this.mozPrefBranch.getBoolPref("whitelist.active");
	},
	
	isDeleteSpamActive: function() {
		return this.mozPrefBranch.getBoolPref("antispam.delete");
	},
	
	isDeleteHoaxActive: function() {
		return this.mozPrefBranch.getBoolPref("antihoax.delete");
	},
	
	isDeleteBlacklistActive: function() {
		return this.mozPrefBranch.getBoolPref("blacklist.delete");
	},
	
	getSpamMinValue: function() {
		return this.mozPrefBranch.getIntPref("antispam.threshold");
	},
	
	getHoaxMinValue: function() {
		return this.mozPrefBranch.getIntPref("antihoax.threshold");
	},
	
	getAntiSpamNoToRuleValue: function() {
		return this.mozPrefBranch.getIntPref("antispam.rules.noto");
	},
	
	getAntiHoaxNoToRuleValue: function() {
		return this.mozPrefBranch.getIntPref("antihoax.rules.noto");
	},
	
	getAntiSpamMultipleToRuleValues: function() {
		var spamRuleValues = new Array(2);
		spamRuleValues[0] = this.mozPrefBranch.getIntPref("antispam.rules.multipleto.add");
		spamRuleValues[1] = this.mozPrefBranch.getIntPref("antispam.rules.multipleto.every");

		return spamRuleValues;
	},
	
	getAntiHoaxMultipleToRuleValues: function() {
		var hoaxRuleValues = new Array(2);
		hoaxRuleValues[0] = this.mozPrefBranch.getIntPref("antihoax.rules.multipleto.add");
		hoaxRuleValues[1] = this.mozPrefBranch.getIntPref("antihoax.rules.multipleto.every");

		return hoaxRuleValues;
	},
	
	getSpamHighWords: function() {
		var spamValue = new Array(1);
		spamValue[0] = this.mozPrefBranch.getIntPref("antispam.words.high.value");
		spamWords = this.mozPrefBranch.getCharPref("antispam.words.high").toLowerCase().split("\n");
		
		if( spamWords.length == 0 || (spamWords.length == 1 && spamWords[0] == "") ) {
			return spamValue;
		}
		
		return spamValue.concat( spamWords );
	},
	
	getSpamLowWords: function() {
		var spamValue = new Array(1);
		spamValue[0] = this.mozPrefBranch.getIntPref("antispam.words.low.value");
		spamWords = this.mozPrefBranch.getCharPref("antispam.words.low").toLowerCase().split("\n");
		
		if( spamWords.length == 0 || (spamWords.length == 1 && spamWords[0] == "") ) {
			return spamValue;
		}

		return spamValue.concat( spamWords );
	},
	
	getHoaxHighWords: function() {
		var hoaxValue = new Array(1);
		hoaxValue[0] = this.mozPrefBranch.getIntPref("antihoax.words.high.value");
		hoaxWords = this.mozPrefBranch.getCharPref("antihoax.words.high").toLowerCase().split("\n");
		
		if( hoaxWords.length == 0 || (hoaxWords.length == 1 && hoaxWords[0] == "") ) {
			return hoaxValue;
		}
		
		return hoaxValue.concat( hoaxWords );
	},
	
	getHoaxLowWords: function() {
		var hoaxValue = new Array(1);
		hoaxValue[0] = this.mozPrefBranch.getIntPref("antihoax.words.low.value");
		hoaxWords = this.mozPrefBranch.getCharPref("antihoax.words.low").toLowerCase().split("\n");
		
		if( hoaxWords.length == 0 || (hoaxWords.length == 1 && hoaxWords[0] == "") ) {
			return hoaxValue;
		}
		
		return hoaxValue.concat( hoaxWords );
	},
	
	isXSpamStatusHeaderActive: function() {
		return this.mozPrefBranch.getBoolPref("header.xspamstatus");
	},
	
	isReceivedHeaderActive: function() {
		return this.mozPrefBranch.getBoolPref("header.received");
	},
	
	getBlacklist: function() {
		return this.mozPrefBranch.getCharPref("blacklist").split("\n");
	},
	
	getWhitelist: function() {
		return this.mozPrefBranch.getCharPref("whitelist").split("\n");
	},
	
	addToSpamCounter: function(numToAdd) {
		this.mozPrefBranch.setIntPref("scan.spam", this.getSpamCounter() + numToAdd);
	},
	
	addToEmailCounter: function(numToAdd) {
		this.mozPrefBranch.setIntPref("scan.email", this.getEmailCounter() + numToAdd);
	},
	
	addToBlacklist: function(itemToAdd) {
		let blacklist = this.mozPrefBranch.getCharPref("blacklist");
		
		if ( blacklist == "" ) {
			blacklist = itemToAdd;
		}
		else {
			blacklist += "\n" + itemToAdd;
		}
		
		this.mozPrefBranch.setCharPref("blacklist", blacklist.replace(/[^\S\r\n]/g, "").replace(/[,;]/g, ""));
	},
	 
	addToWhitelist: function(itemToAdd) {
		let whitelist = this.mozPrefBranch.getCharPref("whitelist");
		
		if ( whitelist == "" ) {
			whitelist = itemToAdd;
		}
		else {
			whitelist += "\n" + itemToAdd;
		}
		
		this.mozPrefBranch.setCharPref("whitelist", whitelist.replace(/[^\S\r\n]/g, "").replace(/[,;]/g, ""));
	}
};
