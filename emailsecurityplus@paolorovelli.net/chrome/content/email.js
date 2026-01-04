/**
 * @file email.js
 * @update 2012/03/26 18:21
 * @author Paolo Rovelli
 */



/* --- BEGIN Email class: --- */
/** 
 * Defines the email class.
 * 
 * @param emailURI  the URI of the email.
 * @param emailHeader  the header of the email.
 * @author Paolo Rovelli
 */
function Email(emailURI, emailHeader) {
	//this.uri = emailURI;  // emailHeader.folder.getUriForMsg(emailHeader)  // email URI
	this.header = emailHeader;  // messenger.messageServiceFromURI(emailURI).messageURIToMsgHdr(emailURI)  // email header from the email URI
	this.id = emailHeader.messageId;  // indicates the message ID of the message
	this.folder = emailHeader.folder;  // indicates the folder in which the message is stored (folder.name indicates the name of the folder)
	//this.size = emailHeader.messageSize;  // indicates the size of the message (in bytes)
	//this.date = emailHeader.date;  // indicates the date of the message
	this.author = this.getEmailAddress(emailHeader.mime2DecodedAuthor);  // indicates the email address of the author of this message
	this.domain = null;  // indicates the email domain of the author of this message
	this.subject = emailHeader.mime2DecodedSubject;  // indicates the subject of this message
	this.recipients = emailHeader.mime2DecodedRecipients;  // indicates the recipients of the message
	this.cc = emailHeader.ccList;  // indicates the Cc list of the message
	this.bcc = emailHeader.bccList;  // indicates the Bcc list of the message
	
	this.body = this.getBody(emailURI, emailHeader);
	
	this.spamScore = 0;
}

//Email attributes (initialization):
//Email.prototype.uri = null;
Email.prototype.header = null;
Email.prototype.id = null;
Email.prototype.folder = null;
//Email.prototype.size = null;
//Email.prototype.date = null;
Email.prototype.author = null;
Email.prototype.domain = null;
Email.prototype.subject = null;
Email.prototype.recipients = null;
Email.prototype.cc = null;
Email.prototype.bcc = null;
Email.prototype.body = null;
Email.prototype.spamScore = null;

//Email methods:
/** 
 * Extracts the email address from the MIME2 decoded author of an email.
 * 
 * @param mime2DecodedAuthor  the MIME2 decoded author of the message.
 * @return  the email address of the author of the email, if any.
 */
Email.prototype.getEmailAddress = function(mime2DecodedAuthor) {
	if( mime2DecodedAuthor != null ) {
		var posStart = mime2DecodedAuthor.search(/</i);
		var posEnd = mime2DecodedAuthor.search(/>/i);
		
		if( (posStart > -1) && (posEnd > posStart) ) {
			return mime2DecodedAuthor.slice(posStart+1, posEnd);
		}  // (posStart > -1) && (posEnd > posStart)
	}  // mime2DecodedAuthor != null
	
	return mime2DecodedAuthor;
};

/** 
 * Extracts the body of the email from the email header.
 * 
 * @param emailURI  the URI of the email.
 * @param emailHeader  the header of the email.
 * @return  the body of the email.
 */
Email.prototype.getBody = function(emailURI, emailHeader) {
	//let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
	let listener = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(Components.interfaces.nsISyncStreamListener);
	messenger.messageServiceFromURI(emailURI).streamMessage(emailURI, listener, null, null, false, "");
	let emailBody = emailHeader.folder.getMsgTextFromStream(listener.inputStream, emailHeader.Charset, 65536, 32768, false, true, { });
	
	return emailBody;
};

/** 
 * Defines the Spam score of the email.
 * 
 * @return  true if an email is flagged like Spam, false otherwise.
 */
Email.prototype.checkSpam = function() {
	var spamSwitch = 0;  // unknown email address
	var spamGap = 25;  // the lenght of the sub-array for searching complex Spam keyword
	
	/* --- BEGIN Recipients reading: --- */
	if( this.recipients == "" || this.recipients == "undisclosed-recipients:;" ) {
		this.spamScore += 5;
	}
	/* --- END Recipients reading. --- */
	
	if( isEmailAddressInAddressBooks(this.author) ) {  // the author email address IS present inside Address Books!
		spamSwitch = 1;
		spamGap = 75;
		
		var numberOfRecipients = this.cc.match(/@/g);
		if( numberOfRecipients != null ) {
			this.spamScore += Math.floor(numberOfRecipients.length / 10);  // +1 for each 10 recipients in CC...
		}
	}  // isEmailAddressInAddressBooks(this.author)
	
	let words = (this.subject + " " + this.body).toLowerCase();
	
	/* --- BEGIN Detection of spam words: --- */
	/*
	 * Checks if the words of the email (words Array) are equals to the Spam words (spam HashMap).
	 * It adds (to spamScore) the corresponding value of each Spam word found (as specified in the spam HashMap)
	 * and it stops when this score reaches the minimum value that marks an email as Spam (esp.spamMinValue).
	 * 
	 * spam[spam:0/hoax:1][riga][key:0/value:1][colonna]
	*/
	for(let i=0; i < spam[spamSwitch].length; i++) {
		let keyPos = words.indexOf( spam[spamSwitch][i][0][0] );
		
		if( keyPos >= 0 ) {  // there is (at least) one occurrence of the first Spam keyword in the sub-array (e.g. "offerta")
			this.spamScore += spam[spamSwitch][i][1][0];
			
			//Debug messages:
			//dump("> Scan: " + spam[spamSwitch][i][0][0] + " (" + spam[spamSwitch][i][1][0] + ")\n");
			
			if( this.spamScore >= esp.spamMinValue ) {  // this is Spam!!!
				return true;
			}
			
			if( spam[spamSwitch][i][0].length > 1 ) {
				let string = words.substr(keyPos+(spam[spamSwitch][i][0][0].length)+1, spamGap);
				
				for(let j=1; j < spam[spamSwitch][i][0].length; j++) {
					if( string.indexOf( spam[spamSwitch][i][0][j] ) == 0  ) {  // there is an occurrence of the complex Spam keyword in the sub-array (e.g. "disponibile solo" => "offerta disponibile solo")
						this.spamScore += spam[spamSwitch][i][1][j];
						
						//Debug messages:
						//dump("> Scan: " + spam[spamSwitch][i][0][j] + " (" + spam[spamSwitch][i][1][j] + ")\n");
						
						if( this.spamScore >= esp.spamMinValue ) {  // this is Spam!!!
							return true;
						}
						
						break;
					}
				}
			}
		}
		
		lastKeyPos = words.lastIndexOf( spam[spamSwitch][i][0][0] );
		
		if( lastKeyPos != keyPos ) {  // there are a second occurrence of the first spam keyword in the sub-array (e.g. "offerta")
			this.spamScore += spam[spamSwitch][i][1][0];
			
			//Debug messages:
			//dump("> Scan2: " + spam[spamSwitch][i][0][0] + " (" + spam[spamSwitch][i][1][0] + ")\n");
			
			if( this.spamScore >= esp.spamMinValue ) {  // this is Spam!!!
				return true;
			}
			
			
			if( spam[spamSwitch][i][0].length > 1 ) {
				string = words.substr(lastKeyPos+(spam[spamSwitch][i][0][0].length)+1, spamGap);
				
				for(let j=1; j < spam[spamSwitch][i][0].length; j++) {
					if( string.indexOf( spam[spamSwitch][i][0][j] ) == 0 ) {  // there is an second occurrence of the complex spam keyword in the sub-array (e.g. "disponibile solo" => "offerta disponibile solo")
						this.spamScore += spam[spamSwitch][i][1][j];
						
						//Debug messages:
						//dump("> Scan2: " + spam[spamSwitch][i][0][j] + " (" + spam[spamSwitch][i][1][j] + ")\n");
						
						if( this.spamScore >= esp.spamMinValue ) {  // this is Spam!!!
							return true;
						}
						
						break;
					}
				}
			}
		}
	}
	/* --- END Detection of spam words. --- */
	
	//Debug messages:
	dump("> Scan email: " + this.id + "\n");  // this.spamScore
	
	return false;  // this is NOT Spam
};


/** 
 * Returns if an email is Spam or not.
 * 
 * @return  true if an email is flagged like Spam, false otherwise.
 */
Email.prototype.isSpam = function() {
	return (this.spamScore >= esp.spamMinValue);
};
/* --- END Email class. --- */
