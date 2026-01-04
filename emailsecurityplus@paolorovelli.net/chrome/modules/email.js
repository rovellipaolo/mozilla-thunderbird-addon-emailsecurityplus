/**
 * @file email.js
 * @update 2012/06/18 18:21
 * @author Paolo Rovelli
 */


var EXPORTED_SYMBOLS = ["emailsecurityplus"];


/** 
 * Defines the Email Security Plus namespace.
 */
if ( typeof emailsecurityplus == "undefined" ) {	var emailsecurityplus = {}; }


Components.utils.import("resource://emailsecurityplus/preferences.js");


/* --- BEGIN Email class: --- */
/**
 * Defines the Email class.
 */
emailsecurityplus.Email = function(emailURI, emailHeader) {
	this.uri = emailURI;        // emailHeader.folder.getUriForMsg(emailHeader)                            // the email URI
	this.header = emailHeader;  // messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI)  // the header from the email URI
	this.id = emailHeader.messageId;        // the message ID of the email
	this.folder = emailHeader.folder;       // the folder in which the email is stored (folder.name indicates the name of the folder)
	//this.size = emailHeader.messageSize;  // the size of the email (in bytes)
	//this.date = emailHeader.date;         // the date of the email
	this.author = this.getEmailAddress;     // the address of the author of the email
	this.authorDomain = this.getDomain;     // the domain of the author of the email
	this.subject = emailHeader.mime2DecodedSubject;        // the subject of the email
	this.recipients = emailHeader.mime2DecodedRecipients;  // the recipients of the email
	this.cc = emailHeader.ccList;           // the CC list of the email
	this.bcc = emailHeader.bccList;         // the BCC list of the email
	this.body = this.getBody;
	this.spamScore = 0;
};

emailsecurityplus.Email.prototype = {
	uri: null,
	header: null,
	id: null,
	folder: null,
	//size: null,
	//date: null,
	author: null,
	authorDomain: null,
	subject: null,
	recipients: null,
	cc: null,
	bcc: null,
	body: null,
	spamScore: null,
	
	get getEmailAddress() {
		let mime2DecodedAuthor = this.header.mime2DecodedAuthor;
		
		if ( mime2DecodedAuthor != null ) {
			var posStart = mime2DecodedAuthor.search(/</i);
			var posEnd = mime2DecodedAuthor.search(/>/i);
			
			if ( (posStart > -1) && (posEnd > posStart) ) {
				return mime2DecodedAuthor.slice(posStart+1, posEnd);
			}
		}
		
		return mime2DecodedAuthor;
	},

	get getDomain() {
		return this.author.substring( this.author.indexOf("@") );
	},
	
	get getBody() {
		let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
		let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(Components.interfaces.nsISyncStreamListener);
		messenger.messageServiceFromURI(this.uri).streamMessage(this.uri, listener, null, null, false, "");
		let emailBody = this.header.folder.getMsgTextFromStream(listener.inputStream, this.header.Charset, 65536, 32768, false, true, { });
		
		return emailBody;
	},
	
	get getXSpamScore() {
		var spamStatus = this.header.getStringProperty("x-spam-status");
		
		if ( spamStatus != null && spamStatus != "" ) {
			var scorePos = spamStatus.indexOf("score=");
			
			if ( scorePos < 0 ) {
				scorePos = spamStatus.indexOf(" hits=");
			}
			
			if ( scorePos >= 0 ) {
				return spamStatus.slice(scorePos + 6).slice(0,  spamStatus.indexOf(" "));
			}
		}
		
		return "---";
	},
	
	get getXSpamRequired() {
		var spamStatus = this.header.getStringProperty("x-spam-status");
		
		if ( spamStatus != null && spamStatus != "" ) {
			var requiredPos = spamStatus.indexOf("required=");
			
			if ( requiredPos >= 0 ) {
				return spamStatus.slice(requiredPos + 9).slice(0,  spamStatus.indexOf(" "));
			}
		}
		
		return "---";
	},
	
	get getXSpamRate() {
		xSpamScore = this.getXSpamScore;
		xSpamRequired = this.getXSpamRequired;
		
		if ( xSpamScore < 0 ) {
			xSpamScore = 0;
		}
		
		if ( xSpamScore != "---" && xSpamRequired != "---" ) {
			return Math.round( (xSpamScore * 100) / xSpamRequired ) + "%";
		}
		
		return "---";
	},
	
	get getReceivedHeader() {
		let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
		let messageService = messenger.messageServiceFromURI(this.uri);
		let messageStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance().QueryInterface(Components.interfaces.nsIInputStream);
		let inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
		
		inputStream.init(messageStream);
		
		try {
			messageService.streamMessage(this.uri, messageStream, null, null, false, null);
		} catch (e) {
			return null;
		}
		
		var content = "";
		
		while ( inputStream.available() ) {
			content = content + inputStream.read(512);
			
			var p = content.indexOf("\r\n\r\n");
			if ( p > 0 ) {
				content = content.substring(0, p);
				break;
			}
			
			p = content.indexOf("\r\r");
			if ( p > 0 ) {
				content = content.substring(0, p);
				break;
			}
			
			p = content.indexOf("\n\n");
			if ( p > 0 ) {
				content = content.substring(0, p);
				break;
			}
		}
		content = content + "\r\n";
		
		var headers = Components.classes["@mozilla.org/messenger/mimeheaders;1"].createInstance().QueryInterface(Components.interfaces.nsIMimeHeaders);
		headers.initialize(content, content.length);
		
		return headers.extractHeader("Received", true);
	},
	
	get getReceivedInfo() {
		var received = new Array(null, null, null, null);
		var regexpIPAddress = /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
		
		var receivedHeader = this.getReceivedHeader;
		
		if ( receivedHeader != null ) {
			var receivedHeaderArray = receivedHeader.split('\n');
			
			if ( receivedHeaderArray.length > 0 ) {
				var ctrlBy = false;
				var ctrlFrom = false;
				
				for (var i = receivedHeaderArray.length - 1; i > 0; i--) {
					var posBy;
					//dump("[" + i + " receivedHeaderArray: " + receivedHeaderArray[i] + "\n");
					
					if ( !ctrlBy ) {
						// Looks for 'by' statement in the Received line:
						posBy = receivedHeaderArray[i].indexOf('by ');
						if ( posBy >= 0 ) {  // "Received: from ... by ns384418.ovh.net"
							ctrlBy = true;
							
							received[2] = receivedHeaderArray[i].slice(posBy + 3);
							received[2] = received[2].slice(0, received[2].indexOf(' '));
							//dump("> Received By: " + received[2] + "\n");
							
							// Looks for IP addresses in the Received line:
							var byString = receivedHeaderArray[i].slice(posBy + 3, receivedHeaderArray[i].length);
							received[3] = byString.match(regexpIPAddress);  // "Received: from ... by ... (8.6.023.02)"
							
							if ( received[3] != null ) {
								received[3] = received[3][0];
								//dump("> Received IP (by): " + received[3] + "\n");
							}
						}
					}
					
					
					if ( !ctrlFrom ) {
						// Looks for 'from' statement in the Received line:
						var posFrom = receivedHeaderArray[i].indexOf('	from ');
						if ( posFrom >= 0 ) {  // "Received: from "
							ctrlFrom = true;
							
							received[0] = receivedHeaderArray[i].slice(posFrom + 6);
							if ( received[0][0] == "[" ) {  // "Received: from [10.10.0.253]"
								received[0] = received[0].slice(1, received[0].indexOf(']'));
							}
							else {  // "Received: from ns384418.ovh.net" or "Received: from nobody" or "Received: from unknown (HELO ns1.softnews.ro)"
								received[0] = received[0].slice(0, received[0].indexOf(' '));
							}
							//dump("> Received From: " + received[0] + "\n");
							
							// Looks for IP addresses in the Received line:
							var fromString = receivedHeaderArray[i].slice(posFrom + 5, receivedHeaderArray[i].length);
							var receivedIP = fromString.match(regexpIPAddress);  // "Received: from ... (193.226.140.133) by ... (8.6.023.02)"
							//dump("> Received IP: " + receivedIP + "\n");
							
							if ( receivedIP != null ) {
								for (var j=0; j < receivedIP.length; j++) {
									if ( receivedIP[j] != received[0] ) {  // "Received: from [10.10.0.253] (193.226.140.133) by ..."
										received[1] = receivedIP[j];
										//dump("> Received IP (from): " + received[1] + "\n");
										
										if ( receivedIP.length > j + 1 ) {  // "Received: from ... by ... (8.6.023.02)"
											received[3] = receivedIP[j+1];
											//dump("> Received IP (by): " + received[3] + "\n");
										}
										
										break;
									}
								}
							}
							
							// Looks for 'by' statement in the Received line:
							var posBy2 = receivedHeaderArray[i].indexOf('by ');
							if ( posBy2 >= 0 && posBy2 != posBy ) {  // "Received: from ... by ns384418.ovh.net"
								ctrlBy = true;
								
								received[2] = receivedHeaderArray[i].slice(posBy2 + 3);
								received[2] = received[2].slice(0, received[2].indexOf(' '));
								//dump("> Received By: " + received[2] + "\n");
							}
						}
					}
					
					if ( ctrlBy && ctrlFrom ) {
						break;
					}
				}
			}
		}
		
		return received;
	},
	
	get isEmailAddressInAddressBooks() {
		let mozAbManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
		let mozAllAddressBooks = mozAbManager.directories;
		
		while ( mozAllAddressBooks.hasMoreElements() ) {
			let addressBook = mozAllAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
			
			if ( addressBook instanceof Components.interfaces.nsIAbDirectory ) {
				if ( addressBook.cardForEmailAddress( this.author ) != null ) {
					return true;
				}
			}
		}
		
		return false;
	},
	
	get checkSpam() {
		var spamThreshold;      // the Spam score threshold
		var spamNoToRuleValue;  // the AntiSpam "no-to" rule value
		var spamMultipleToRuleValues;  // the AntiSpam "multiple-to" rule values: [0: add, 1: every]
		var spamWords = new Array(2);  // Spam words: high and low
		
		/* --- BEGIN Sender analysis (known or unknown): --- */		
		if ( this.isEmailAddressInAddressBooks ) {
			// HOAX:
			spamThreshold = emailsecurityplus.Preferences.getHoaxMinValue();

			spamNoToRuleValue = emailsecurityplus.Preferences.getAntiHoaxNoToRuleValue();
			spamMultipleToRuleValues = emailsecurityplus.Preferences.getAntiHoaxMultipleToRuleValues();

			spamWords[0] = emailsecurityplus.Preferences.getHoaxHighWords();
			spamWords[1] = emailsecurityplus.Preferences.getHoaxLowWords();
		}
		else {
			// SPAM:
			spamThreshold = emailsecurityplus.Preferences.getSpamMinValue();

			spamNoToRuleValue = emailsecurityplus.Preferences.getAntiSpamNoToRuleValue();
			spamMultipleToRuleValues = emailsecurityplus.Preferences.getAntiSpamMultipleToRuleValues();

			spamWords[0] = emailsecurityplus.Preferences.getSpamHighWords();
			spamWords[1] = emailsecurityplus.Preferences.getSpamLowWords();
		}
		/* --- ENG Sender analysis (known or unknown). --- */
		
		//dump("> If no recipient is included add: " + spamNoToRuleValue + "\n");
		//dump("> If there are multiple recipients add: " + spamMultipleToRuleValues[0] + " every " + spamMultipleToRuleValues[1] + " (recipients)\n");
		
		/* --- BEGIN Recipients reading: --- */
		if ( this.recipients == "" || this.recipients == "undisclosed-recipients:;" ) {
			this.spamScore += spamNoToRuleValue;
		}

		var numberOfRecipients = this.cc.match(/@/g);
		if ( numberOfRecipients != null ) {
			this.spamScore += Math.floor(numberOfRecipients.length / spamMultipleToRuleValues[1]) * spamMultipleToRuleValues[0];  // spamMultipleToRuleValues[0] for each spamMultipleToRuleValues[1] recipients in CC...
		}
		/* --- END Recipients reading. --- */
		
		let emailWords = (this.subject + " " + this.body).toLowerCase();
		
		/* --- BEGIN Detection of spam words: --- */
		/*
		 * Checks if the words of the email (words Array) are equals to the Spam words (spamKeywords).
		 * It adds (to spamScore) the corresponding value of each Spam word found and it stops when this score reaches the score threashold (emailsecurityplus.Preferences.getSpamMinValue()).
		 */

		for(let s=0; s < 2; s++) {  // Spam words: high and low
			//dump("> Spam words lengh: " + spamWords[s].length + "\n");
			//dump("> Spam words value: " + spamWords[s][0] + "\n");
			//dump("> Spam words: " + spamWords[s] + "\n");

			for (let i=1; i < spamWords[s].length; i++) {
				let keyPos = emailWords.indexOf( spamWords[s][i] );

				if ( keyPos >= 0 ) {  // there is (at least) one occurrence of the Spam word...
					this.spamScore += spamWords[s][0];
					dump("> Scan: " + spamWords[s][i] + " (" + spamWords[s][0] + ")\n");
					
					if ( this.spamScore >= spamThreshold ) {
						return true;
					}
				}
				
				lastKeyPos = emailWords.lastIndexOf( spamWords[s][i] );
				
				if ( lastKeyPos != keyPos ) {  // there are a second occurrence of the first Spam keyword in the sub-array (e.g. "offerta")
					this.spamScore += spamWords[s][0];
					dump("> Scan: " + spamWords[s][i] + " (" + spamWords[s][0] + ")\n");
					
					if ( this.spamScore >= spamThreshold ) {
						return true;
					}
				}
			}
		}
		/* --- END Detection of spam words. --- */

		//dump("> Scan email: " + this.id + " (" + this.spamScore + ")\n");
		
		return false;
	}
};
/* --- END Email class. --- */
