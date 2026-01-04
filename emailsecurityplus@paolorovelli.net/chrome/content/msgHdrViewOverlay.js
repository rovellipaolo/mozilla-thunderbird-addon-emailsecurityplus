/**
 * @file msgHdrViewOverlay.js
 * @update 2012/06/18 18:52
 * @author Paolo Rovelli
 */



/** 
 * Defines the Email Security Plus NameSpace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


//Import code modules:
Components.utils.import("resource://emailsecurityplus/preferences.js");
Components.utils.import("resource://emailsecurityplus/email.js");


/* --- BEGIN Watch for New Mail: --- */
/**
 * Defines the Email Security Plus new email listener class.
 * 
 * @author Paolo Rovelli
 */
emailsecurityplus.MsgHdrViewOverlay = {
	/**
	 * Resets the expanded header.
	 */
	resetExpandedHeader2Rows: function() {
		//Clean the labels of the expandedHeader2Rows:
		document.getElementById("emailsecurityplus-ReceivedFrom").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedIPFromL1").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedIPFrom").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedIPFromL2").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedBy").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedIPByL1").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedIPBy").setAttribute("value", "");
		document.getElementById("emailsecurityplus-ReceivedIPByL2").setAttribute("value", "");
	},
	
	
	/**
	 * Display the expanded header.
	 */
	displayExpandedHeader: function() {
		emailsecurityplus.MsgHdrViewOverlay.resetExpandedHeader2Rows();
		
		let emailHeader = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));
		let emailURI = emailHeader.folder.getUriForMsg(emailHeader);
		
		var email = new emailsecurityplus.Email(emailURI, emailHeader);
		
		
		//X-Spam-Status header:
		if ( emailsecurityplus.Preferences.isXSpamStatusHeaderActive() ) {
			document.getElementById("emailsecurityplus-expandedXSpamStatusHeader").collapsed = false;
			
			var headerElement = document.getElementById("emailsecurityplus-XSpamStatus");
			var xSpamScore = email.getXSpamScore;
			var xSpamRequired= email.getXSpamRequired;
			if( xSpamScore != "---" && xSpamRequired != "---" ) {
				headerElement.headerValue = "score: " + xSpamScore + " / " + xSpamRequired;
				//headerElement.valid = true;
			}
			else {  // xSpamScore = "---" || xSpamRequired == "---"
				headerElement.headerValue = "";
				//headerElement.valid = true;
				document.getElementById("emailsecurityplus-expandedXSpamStatusHeader").collapsed = true;
			}
		}
		else {  // !emailsecurityplus.Preferences.isXSpamStatusHeaderActive()
			document.getElementById("emailsecurityplus-expandedXSpamStatusHeader").collapsed = true;
		}
		
		
		//Received header:
		if ( emailsecurityplus.Preferences.isReceivedHeaderActive() ) {
			document.getElementById("emailsecurityplus-expandedReceivedHeader").collapsed = false;
			
			var receivedHeader = email.getReceivedHeader;
			
			
			/**
			 * received[0]: from
			 * received[1]: IP (from)
			 * received[2]: by
			 * received[3]: IP (by)
			 */
			var received = email.getReceivedInfo;
			
			if ( received[0] != null ) {
				document.getElementById("emailsecurityplus-ReceivedFrom").setAttribute("value", received[0]);
			}
			
			if ( received[1] != null ) {
				document.getElementById("emailsecurityplus-ReceivedIPFromL1").setAttribute("value", "(");
				document.getElementById("emailsecurityplus-ReceivedIPFromL2").setAttribute("value", ")");
				
				document.getElementById("emailsecurityplus-ReceivedIPFrom").setAttribute("value", received[1]);
			}
			
			if ( received[2] != null ) {
				document.getElementById("emailsecurityplus-ReceivedBy").setAttribute("value", received[2]);
			}
			
			if ( received[3] != null ) {
				document.getElementById("emailsecurityplus-ReceivedIPByL1").setAttribute("value", "(");
				document.getElementById("emailsecurityplus-ReceivedIPByL2").setAttribute("value", ")");
				
				document.getElementById("emailsecurityplus-ReceivedIPBy").setAttribute("value", received[3]);
			}
		}
		else {  // !emailsecurityplus.Preferences.isReceivedHeaderActive()
			document.getElementById("emailsecurityplus-expandedReceivedHeader").collapsed = true;
		}
	},
	
	
	/**
	 * Loads the expanded header listener.
	 */
	load: function() {
		var listener = {};
		listener.onStartHeaders = function() {};
		listener.onEndHeaders = function() {
			emailsecurityplus.MsgHdrViewOverlay.displayExpandedHeader();
		};
		
		gMessageListeners.push(listener);
	}
};


window.addEventListener("load", function() { emailsecurityplus.MsgHdrViewOverlay.load(); }, false);
