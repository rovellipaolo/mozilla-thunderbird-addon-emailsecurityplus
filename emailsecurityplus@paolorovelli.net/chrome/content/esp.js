/**
 * @file esp.js
 * @update 2012/03/26 16:03
 * @author Paolo Rovelli
 */



let mozPreferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.emailsecurityplus.");    // nsIPrefBranch
var esp = new ESP();

/* --- BEGIN Email Security Plus class: --- */
/** 
 * Defines the Email Security Plus class.
 * 
 * @author Paolo Rovelli
 */
function ESP() {
	this.scanActive = mozPreferences.getBoolPref("scan");
	this.spamMinValue = mozPreferences.getIntPref("scan.aggressiveness");
	this.friendsList = mozPreferences.getBoolPref("scan.friendslist");
	this.deleteSpam = mozPreferences.getBoolPref("scan.delete");
	this.whitelistActive = mozPreferences.getBoolPref("whitelist.active");
	this.blacklistActive = mozPreferences.getBoolPref("blacklist.active");
	this.blacklist = mozPreferences.getCharPref("blacklist").split("\n");
	//this.fileBlocked = mozPreferences.getIntPref("attachments.block");
}

//ESP attributes (initialization):
ESP.prototype.scanActive = null;
ESP.prototype.spamMinValue = null;
ESP.prototype.friendsList = null;
ESP.prototype.deleteSpam = null;
ESP.prototype.whitelistActive = null;
ESP.prototype.blacklistActive = null;
ESP.prototype.blacklist = null;
//ESP.prototype.fileBlocked = null;

//ESP methods:
/** 
 * Returns if the automatic scan preference is active or not.
 * 
 * @return  true if the automatic scan preference is active, false otherwise.
 */
ESP.prototype.isScanActive = function() {
	return this.scanActive;
};

/** 
 * Returns if the Friends List preference is active or not.
 * 
 * @return  true if the Friends List preference is active, false otherwise.
 */
ESP.prototype.isFriendsListActive = function() {
	return this.friendsList;
};

/** 
 * Returns if the delete Spam preference is active or not.
 * 
 * @return  true if the delete Spam preference is active, false otherwise.
 */
ESP.prototype.isDeleteSpamActive = function() {
	return this.deleteSpam;
};

/** 
 * Returns if the whitelist preference is active or not.
 * 
 * @return  true if the whitelist preference is active, false otherwise.
 */
ESP.prototype.isWhitelistActive = function() {
	return this.whitelist;
};

/** 
 * Returns if the blacklist preference is active or not.
 * 
 * @return  true if the blacklist preference is active, false otherwise.
 */
ESP.prototype.isBlacklistActive = function() {
	return this.blacklistActive;
};


/** 
 * Updates the automatic scan preference.
 */
ESP.prototype.updateScanActive = function() {
	this.scanActive = mozPreferences.getBoolPref("scan");
};

/** 
 * Updates the automatic scan preference.
 */
ESP.prototype.updateSpamMinValue = function() {
	this.spamMinValue = mozPreferences.getIntPref("scan.aggressiveness");
};

/** 
 * Updates the Friends List preference.
 */
ESP.prototype.updateFriendsList = function() {
	this.friendsList = mozPreferences.getBoolPref("scan.friendslist");
};

/** 
 * Updates the delete scan preference.
 */
ESP.prototype.updateDeleteSpam = function() {
	this.deleteSpam = mozPreferences.getBoolPref("scan.delete");
};

/** 
 * Updates the whitelist active preference.
 */
ESP.prototype.updateWhitelistActive = function() {
	this.whitelistActive = mozPreferences.getBoolPref("scan.whitelist.active");
};

/** 
 * Updates the blacklist active preference.
 */
ESP.prototype.updateBlacklistActive = function() {
	this.blacklistActive = mozPreferences.getBoolPref("blacklist.active");
};

/** 
 * Updates the blacklist preference array.
 */
ESP.prototype.updateBlacklist = function() {
	let tmpBL = mozPreferences.getCharPref("blacklist");
	
	if( tmpBL.indexOf(" ") >= 0 || tmpBL.indexOf(",") >= 0 || tmpBL.indexOf(";") >= 0 ) {  // if there are (additional) white spaces
		mozPreferences.setCharPref("blacklist", tmpBL.replace(/[^\S\r\n]/g, "").replace(/[,;]/g, ""));
	}
	
	this.blacklist = tmpBL.split("\n");
};

/** 
 * Adds an email address or domain to the blacklist preference array.
 * 
 * @param itemToAdd  the email address or domain to be added to the blacklist preference array.
 */
ESP.prototype.addToBlacklist = function(itemToAdd) {
	let tmpBL;
	
	if( esp.blacklist.length == 1 && esp.blacklist[0] == "" ) {
		tmpBL = itemToAdd;
	}
	else {  // !(esp.blacklist.length == 1 && esp.blacklist[0] == "")
		tmpBL = mozPreferences.getCharPref("blacklist") + "\n" + itemToAdd;
	}
	
	mozPreferences.setCharPref("blacklist", tmpBL);
	
	this.updateBlacklist();
};
/* --- END Email Security Plus class. --- */
