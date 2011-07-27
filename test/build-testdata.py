#!/usr/bin/python

# After running this the output can be turned into test data by running
#
# (echo "var top1000Sites = {" 
#   && cat sites.txt | grep -v "null null" | sed "s/^.... \(\"[^\"]*\"\) \(\"[^\"]*\"\) \(\".*\"\)/  \1: {url: \2, title: \3},/g"
#   && echo "  \"\": null"
#   && echo "}") > testdata.js

import codecs
import httplib
import optparse
import re
import sys
import urllib2

TOP1000 = "http://www.google.com/adplanner/static/top1000/"

CHROME_USER_AGENT = "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.1 (KHTML, like Gecko) Ubuntu/11.04 Chromium/14.0.825.0 Chrome/14.0.825.0 Safari/535.1"
IE6_USER_AGENT = "Mozilla/5.0 (compatible; MSIE 6.0; Windows NT 5.1)"
TIMEOUT = 10

# A list of ways to try to fetch the front page of a domain.
PAGE_FETCH_PATTERNS = [
  ("http://www.%(domain)s/", CHROME_USER_AGENT),
  ("http://%(domain)s/", CHROME_USER_AGENT),
  ("http://www.%(domain)s", CHROME_USER_AGENT),
  ("http://www.%(domain)s/", IE6_USER_AGENT)
]

ESCAPEES = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
}

def json_escape(s):
  result = []
  for c in s:
    escapee = ESCAPEES.get(c, None)
    if escapee:
      result.append(escapee)
    elif c < ' ':
      result.append("\\u%.4X" % ord(c))
    else:
      result.append(c)
  return "".join(result)

def to_json(o):
  if o is None:
    return "null"
  elif (type(o) is str) or (type(o) is unicode):
    return '\"%s\"' % json_escape(o)
  else:
    return "<error>"

def output(out, str):
  (encoded, length) = codecs.lookup("utf-8").encode(str)
  out.write(encoded)
  out.write("\n")
  out.flush()

# Fetch a url and attempt to decode it properly according to its charset.
def fetch_url(url, user_agent):
  req = urllib2.Request(url, headers={"User-Agent": user_agent})
  try:
    stream = urllib2.urlopen(req, timeout=TIMEOUT)
  except IOError, e:
    print url, e
    return (None, None)
  url = stream.geturl()
  try:
    result = stream.read()
  except httplib.IncompleteRead, ir:
    result = ir.args[0]
  stream.close()
  return (url, decode_page(result))

DEFAULT_CHARSET = "ISO-8859-1"
CHARSET_PATTERNS = [
  r"<meta[^>]*content=\"[^\"]+charset=([^\"]*)\"",
  r"<meta[^>]*charset=\"([^\"]*)\"",
]

def do_decode(codec, input):
  if codec == codecs.lookup("latin1"): # Grr!
    return codec.decode(input)
  else:
    return codec.decode(input, errors="ignore")

# Attempts to decode a page correctly according to its charse.  Yes this code
# uses regexps to parse xml.  The centre _can_ hold.
def decode_page(page):
  charset_match = None
  # See if we can find a charset specification we recognize.
  for pattern in CHARSET_PATTERNS:
    charset_match = re.search(pattern, page)
    if charset_match:
      break
  if charset_match:
    charset = charset_match.group(1)
    try:
      codec = codecs.lookup(charset)
    except LookupError:
      print "Unknown codec", charset
      return unicode(page, DEFAULT_CHARSET)
    try:
      (output, length) = do_decode(codec, page)
      return output
    except UnicodeDecodeError:
      print "Error decoding page in charset", charset
      return None
  else:
    return unicode(page, DEFAULT_CHARSET)

# Generator that generates the list of domains to process.  The list is based
# on the top doubleclick ad planner top 1000.
def fetch_domains():
  (url, toplist) = fetch_url(TOP1000, CHROME_USER_AGENT)
  for line in toplist.split("\n"):
    if "adplanner/planning/site_profile" in line:
      match = re.search("<a[^>]*>(.*)</a>", line)
      domain = match.group(1)
      yield domain

TITLE_START = re.compile("<title[^>]*>", re.I)
TITLE_END = re.compile("</title>", re.I)

# Fetches the front page of the given domain and returns the url the page was
# fetched from and the title.  If no front page or title can be found none is
# returned.
def fetch_title(domain):
  for (format, user_agent) in PAGE_FETCH_PATTERNS:
    (url, title) = try_fetch(format % {'domain': domain}, user_agent)
    if url and title:
      return (url, title)
  print domain, "No <title> found."
  return (None, None)

REDIRECTS = [
  re.compile(r"<meta HTTP-EQUIV=\"REFRESH\" content=\".*url=([^\"]+)\"", re.I | re.M),
  re.compile(r"window.location=\"([^\"]+)\"", re.I | re.M)
]

def try_fetch(root, user_agent):
  (url, front_page) = fetch_url(root, user_agent)
  if not front_page:
    return (None, None)
  title_start_match = TITLE_START.search(front_page)
  title_end_match = TITLE_END.search(front_page)
  if not title_start_match or not title_end_match:
    # If there's no title try some manual redirects.  Getting desperate here.
    for pattern in REDIRECTS:
      redirect = pattern.search(front_page)
      if redirect:
        target = root + redirect.group(1)
        print "Redirecting to", target
        (url, title) = try_fetch(target, user_agent)
        if url and title:
          return (url, title)
    return (None, None)
  raw_title = front_page[title_start_match.end():title_end_match.start()]
  # Turn multiple whitespace chars (including newline) into single whitespaces
  cleaned_title = re.sub("\s+", " ", raw_title)
  # Drop leading and trailing whitespace
  title = cleaned_title.strip()
  return (url, title)

def run_fetcher(out, should_fetch):
  index = 0
  for domain in fetch_domains():
    # If some domains are given as arguments skip over those that aren't
    # mentioned.
    if should_fetch(domain, index):
      (url, title) = fetch_title(domain)
      output(out, '%04i %s %s %s' % (index, to_json(domain), to_json(url), to_json(title)))
    index += 1

def parse_flags():
  parser = optparse.OptionParser()
  parser.add_option("--skip", action="append")
  parser.add_option("--update")
  return parser.parse_args()

def read_progress(file):
  map = {}
  for line in open(file, "rt"):
    if "null null" in line:
      continue
    index = int(line[:4])
    map[index] = line
  return map

def get_output(flags):
  if flags.update:
    return open(flags.update, "w")
  else:
    return sys.stdout

def main():
  (flags, args) = parse_flags()
  to_fetch = args
  to_skip = flags.skip or []
  if flags.update:
    progress = read_progress(flags.update)
  else:
    progress = {}
  out = get_output(flags)
  for key in sorted(progress.keys()):
    out.write(progress[key])
  def should_fetch(domain, index):
    if to_fetch:
      return domain in to_fetch
    else:
      return (not domain in to_skip) and (not index in progress)
  run_fetcher(out, should_fetch)

if __name__ == "__main__":
  try:
    main()
  except KeyboardInterrupt:
    print "Aw, Snap!"
