/**
 * @file prefs.js
 * @update 2012/06/18 19:08
 * @author Paolo Rovelli
 */

pref("extensions.emailsecurityplus.scan", true);
pref("extensions.emailsecurityplus.scan.spam", 0);
pref("extensions.emailsecurityplus.scan.email", 0);
pref("extensions.emailsecurityplus.scan.aggressiveness", 25);
pref("extensions.emailsecurityplus.scan.friendslist", false);
pref("extensions.emailsecurityplus.scan.delete", true);

pref("extensions.emailsecurityplus.languages.english", true);
pref("extensions.emailsecurityplus.languages.italian", false);

pref("extensions.emailsecurityplus.whitelist.active", false);

pref("extensions.emailsecurityplus.blacklist", "");
pref("extensions.emailsecurityplus.blacklist.active", true);

pref("extensions.emailsecurityplus.header.received", false);
pref("extensions.emailsecurityplus.header.xspamstatus", true);

pref("extensions.emailsecurityplus@paolorovelli.net.description", "chrome://emailsecurityplus/locale/overlay.properties");
