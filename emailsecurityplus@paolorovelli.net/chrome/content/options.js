/**
 * @file options.js
 * @update 2012/06/18 19:36
 * @author Paolo Rovelli
 */



/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) { var emailsecurityplus = {}; }


Components.utils.import("resource://emailsecurityplus/preferences.js");


/**
 * Defines the Email Security Plus options class.
 */
emailsecurityplus.Options = {	
	loadWebsite: function(e) {
		if ( e.button == 0 ) {
			this.openURL(e.target.value);
		}
	},
	
	openURL: function(url) {
		if ( url.substring(0,4) == "www." ) {
			url = "http://" + url;
		}
		else {
			url = "mailto:" + url;
		}
		
		let ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
		let protocolSvc = Components.classes['@mozilla.org/uriloader/external-protocol-service;1'].getService(Components.interfaces.nsIExternalProtocolService);
		let uri = ios.newURI(url, null, null);
		
		if ( !protocolSvc.isExposedProtocol(uri.scheme) ) {
			protocolSvc.loadUrl(uri);
		}
		else {
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
	
	checkDependences: function(check, dependences) {
		if ( check ) {
			//window.document.getElementById(dependences).setAttribute("disabled", "true");
			var elements = window.document.getElementsByClassName(dependences);
			for (var i=0; i < elements.length; i++) { 
				elements[i].setAttribute("disabled", "true");
			}
		}
		else {
			//window.document.getElementById(dependences).removeAttribute("disabled");
			var elements = window.document.getElementsByClassName(dependences);
			for (var i=0; i < elements.length; i++) { 
				elements[i].removeAttribute("disabled");
			}
		}
	},
	
	checkAntiSpamDependences: function() {
		if ( emailsecurityplus.Preferences.isAntiSpamActive() ) {
			this.checkDependences(true, 'antispamActiveDependancies');
		}
		else {
			this.checkDependences(false, 'antispamActiveDependancies');
		}
	},
	
	checkAntiHoaxDependences: function() {
		if ( emailsecurityplus.Preferences.isAntiHoaxActive() ) {
			this.checkDependences(true, 'antihoaxActiveDependancies');
		}
		else {
			this.checkDependences(false, 'antihoaxActiveDependancies');
		}
	},
	
	checkBlacklistDependences: function() {
		if ( emailsecurityplus.Preferences.isBlacklistActive() ) {
			this.checkDependences(true, 'blacklistActiveDependancies');
		}
		else {
			this.checkDependences(false, 'blacklistActiveDependancies');
		}
	},
	
	checkWhitelistDependences: function() {
		if ( emailsecurityplus.Preferences.isWhitelistActive() ) {
			this.checkDependences(true, 'whitelistActiveDependancies');
		}
		else {
			this.checkDependences(false, 'whitelistActiveDependancies');
		}
	},
	
	loadDependences: function() {
		if ( !emailsecurityplus.Preferences.isAntiSpamActive() ) {
			this.checkDependences(true, 'antispamActiveDependancies');
		}

		if ( !emailsecurityplus.Preferences.isAntiHoaxActive() ) {
			this.checkDependences(true, 'antihoaxActiveDependancies');
		}

		if ( !emailsecurityplus.Preferences.isBlacklistActive() ) {
			this.checkDependences(true, 'blacklistActiveDependancies');
		}

		if ( !emailsecurityplus.Preferences.isWhitelistActive() ) {
			this.checkDependences(true, 'whitelistActiveDependancies');
		}
	}
};


window.addEventListener("load", function() { emailsecurityplus.Options.loadDependences(); }, true);
