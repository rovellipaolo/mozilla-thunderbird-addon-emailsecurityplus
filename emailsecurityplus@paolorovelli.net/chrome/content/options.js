/**
 * @file options.js
 * @update 2012/06/18 19:36
 * @author Paolo Rovelli
 */



/** 
 * Defines the Email Security Plus NameSpace.
 */
if ( typeof emailsecurityplus == "undefined" ) { var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");


/**
 * Defines the Email Security Plus options class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.Options = {	
	/**
	 * Opens an URL.
	 * 
	 * @param e  an event.
	 */
	loadWebsite: function(e) {
		if( e.button == 0 ) {
			this.openURL(e.target.value);
		}
	},
	
	
	/**
	 * Opens an URL.
	 * 
	 * @param url  an URL (without "http://" or "mailto:").
	 */
	openURL: function(url) {
		if ( url.substring(0,4) == "www." ) {
			url = "http://" + url;
		}
		else {  // url.substring(0,4) != "www."
			url = "mailto:" + url;
		}
		
		let ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		let protocolSvc = Components.classes['@mozilla.org/uriloader/external-protocol-service;1'].getService(Components.interfaces.nsIExternalProtocolService);
		
		let uri = ios.newURI(url, null, null);
		
		if ( !protocolSvc.isExposedProtocol(uri.scheme) ) {
			protocolSvc.loadUrl(uri);
		}
		else {  // protocolSvc.isExposedProtocol(uri.scheme)
			let loadgroup = Components.classes['@mozilla.org/network/load-group;1'].createInstance(Components.interfaces.nsILoadGroup);
			let appstartup = Components.classes['@mozilla.org/toolkit/app-startup;1'].getService(Components.interfaces.nsIAppStartup);
			
			let loadListener = {onStartRequest: function ll_start(aRequest, aContext) {appstartup.enterLastWindowClosingSurvivalArea();}, onStopRequest: function ll_stop(aRequest, aContext, aStatusCode) {appstartup.exitLastWindowClosingSurvivalArea();}, QueryInterface: function ll_QI(iid) {if (iid.equals(Components.interfaces.nsISupports) || iid.equals(Components.interfaces.nsIRequestObserver) || iid.equals(Components.interfaces.nsISupportsWeakReference)) {return this;}throw Components.results.NS_ERROR_NO_INTERFACE;}};
			loadgroup.groupObserver = loadListener;
			
			let uriListener = {onStartURIOpen: function (uri) {return false;}, doContent: function (ctype, preferred, request, handler) {return false;}, isPreferred: function (ctype, desired) {return false;}, canHandleContent: function (ctype, preferred, desired) {return false;}, loadCookie: null, parentContentListener: null, getInterface: function (iid) {if (iid.equals(Components.interfaces.nsIURIContentListener)) {return this;}if (iid.equals(Components.interfaces.nsILoadGroup)) {return loadgroup;}throw Components.results.NS_ERROR_NO_INTERFACE;}};
			let channel = ios.newChannelFromURI(uri);
			
			let uriLoader = Components.classes['@mozilla.org/uriloader;1'].getService(Components.interfaces.nsIURILoader);
			uriLoader.openURI(channel, true, uriListener);
		}
	},


	/**
	 * Checks generic dependences.
	 * 
	 * @param check  true or false.
	 * @param dependences  the class of the dependences.
	 */
	checkDependences: function(check, dependences) {
		if ( check ) {  // swap: true -> false
			//Disabling the elements that depend:
			//window.document.getElementById(dependences).setAttribute("disabled", "true");
			var elements = window.document.getElementsByClassName(dependences);

			for (var i=0; i < elements.length; i++) { 
				elements[i].setAttribute("disabled", "true");
			}
		}
		else {  // !check  // swap: false -> true
			//Enabling back elements by removing the "disabled" attribute:
			//window.document.getElementById(dependences).removeAttribute("disabled");
			var elements = window.document.getElementsByClassName(dependences);

			for (var i=0; i < elements.length; i++) { 
				elements[i].removeAttribute("disabled");
			}
		}
	},


	/**
	 * Checks AntiSpam dependences.
	 */
	checkAntiSpamDependences: function() {
		if ( emailsecurityplus.Preferences.isAntiSpamActive() ) {
			//Disabling the elements that depend from the AntiSpam:
			this.checkDependences(true, 'antispamActiveDependancies');
		}
		else {  // !emailsecurityplus.Preferences.isAntiSpamActive()
			//Enabling back elements by removing the "disabled" attribute:
			this.checkDependences(false, 'antispamActiveDependancies');
		}
	},


	/**
	 * Checks AntiHoax dependences.
	 */
	checkAntiHoaxDependences: function() {
		if ( emailsecurityplus.Preferences.isAntiHoaxActive() ) {
			//Disabling the elements that depend from the AntiHoax:
			this.checkDependences(true, 'antihoaxActiveDependancies');
		}

		else {  // !emailsecurityplus.Preferences.isAntiSpamActive()
			//Enabling back elements by removing the "disabled" attribute:
			this.checkDependences(false, 'antihoaxActiveDependancies');
		}
	},


	/**
	 * Checks Blacklist dependences.
	 */
	checkBlacklistDependences: function() {
		if ( emailsecurityplus.Preferences.isBlacklistActive() ) {
			//Disabling the elements that depend from the blacklist:
			this.checkDependences(true, 'blacklistActiveDependancies');
		}
		else {  // !emailsecurityplus.Preferences.isBlacklistActive()
			//Enabling back elements by removing the "disabled" attribute:
			this.checkDependences(false, 'blacklistActiveDependancies');
		}
	},


	/**
	 * Checks Whitelist dependences.
	 */
	checkWhitelistDependences: function() {
		
		if ( emailsecurityplus.Preferences.isWhitelistActive() ) {
			//Disabling the elements that depend from the whitelist:
			this.checkDependences(true, 'whitelistActiveDependancies');
		}
		else {  // !emailsecurityplus.Preferences.isWhitelistActive()
			//Enabling back elements by removing the "disabled" attribute:
			this.checkDependences(false, 'whitelistActiveDependancies');
		}
	},
	
	
	/**
	 * Loads dependences.
	 */
	loadDependences: function() {
		if ( !emailsecurityplus.Preferences.isAntiSpamActive() ) {
			//Disabling the elements that depend from the AntiSpam:
			this.checkDependences(true, 'antispamActiveDependancies');
		}

		if ( !emailsecurityplus.Preferences.isAntiHoaxActive() ) {
			//Disabling the elements that depend from the AntiHoax:
			this.checkDependences(true, 'antihoaxActiveDependancies');
		}

		if ( !emailsecurityplus.Preferences.isBlacklistActive() ) {
			//Disabling the elements that depend from the blacklist:
			this.checkDependences(true, 'blacklistActiveDependancies');
		}

		if ( !emailsecurityplus.Preferences.isWhitelistActive() ) {
			//Disabling the elements that depend from the whitelist:
			this.checkDependences(true, 'whitelistActiveDependancies');
		}
	}
};


window.addEventListener("load", function() { emailsecurityplus.Options.loadDependences(); }, true);
