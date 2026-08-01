const ALLOWED_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.es", "hotmail.it",
  "live.com", "live.co.uk", "live.fr", "live.de", "live.nl", "live.be", "live.com.ar", "live.com.mx", "msn.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.com.ar",
  "yahoo.com.br", "yahoo.com.mx", "yahoo.co.jp", "yahoo.co.in", "yahoo.ca", "yahoo.com.au", "ymail.com",
  "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "protonmail.ch",
  "zoho.com", "zohomail.com",
  "aol.com", "aol.co.uk", "aim.com",
  "gmx.com", "gmx.net", "gmx.de", "gmx.at", "gmx.ch", "gmx.fr",
  "web.de", "t-online.de", "freenet.de",
  "orange.fr", "wanadoo.fr", "laposte.net",
  "yahoo.ro", "gmail.ro",
  "mail.com", "email.com",
  "fastmail.com", "fastmail.fm", "fastmail.net", "fastmail.org",
  "tutanota.com", "tuta.io", "pm.me", "hey.com",
  "yandex.com", "yandex.ru", "yandex.ua",
  "mail.ru", "bk.ru", "inbox.ru", "list.ru", "rambler.ru", "ukr.net",
  "wp.pl", "o2.pl", "interia.pl", "onet.pl",
  "seznam.cz", "post.cz",
  "libero.it", "virgilio.it", "tin.it",
  "terra.com.br", "uol.com.br", "bol.com.br", "ig.com.br",
  "rediffmail.com", "naver.com", "daum.net", "hanmail.net",
  "qq.com", "163.com", "126.com", "sina.com", "sohu.com",
  "btinternet.com", "sky.com", "ntlworld.com", "talktalk.net",
  "virginmedia.com", "blueyonder.co.uk",
  "bell.net", "rogers.com", "shaw.ca", "telus.net",
  "bigpond.com", "optusnet.com.au", "iinet.net.au",
]);

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1] ?? "";
  if (domain.endsWith(".edu") || domain.endsWith(".gov")) return true;
  return ALLOWED_DOMAINS.has(domain);
}
