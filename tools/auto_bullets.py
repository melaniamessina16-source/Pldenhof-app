"""Automatic summary of a website product page: sentences are copied word for word from the website text,
nothing is written or rephrased. Used for brands that are not hand-written (products get autoText=True)."""
import re

KEEP = re.compile(r'(laags|lagen|laag |aluminium|kern|roestvrij|rvs|coating|anti-?aanbak|antikleef|keramisch|inductie|oven|vaatwas|garantie|'
                  r'silvinox|deksel|greep|steel|rand|schenk|warmte|bodem|PTFE|PFOA|PFAS|handafwas|afwassen|reinig|gietijzer|plaatstaal|email|'
                  r'hittebestendig|grep|verkocht|apart|afzonderlijk|geschikt voor|gemaakt van|vervaardigd|\bset\b|inclusief|geleverd)', re.I)
DROP = re.compile(r'(heeft een diameter|heeft een inhoud|diameter van|inhoud van \d|\bmm\b dik$|ontworpen door|gratis|nu inclusief|ons blog|bekijk|lees meer|\bu\b.*\bkoop)', re.I)
SENT = re.compile(r'(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9])')
USE = re.compile(r'(?:^|[.!?]\s+)(?:Gebruik|Gebruikt u|U gebruikt)\s+(?:de|het|deze|dit|uw)\s+[^.]*?\bvoor\s+(.+?)[.!?](?:\s|$)', re.I)

def sentences(text):
    out = []
    for s in SENT.split(text.replace(' ', ' ')):
        s = s.strip(' .,;')
        if s: out.append(s + '.')
    return out

def summarize(paras, max_bullets=9):
    """paras = description paragraphs after the page title. Returns (suitedFor or None, bullets)."""
    suited = None
    for p in paras:
        m = USE.search(p)
        if m:
            t = m.group(1).strip(' ,')
            suited = 'Voor ' + t + '.'; break
    seen, bullets = set(), []
    for p in paras:
        if len(p) < 3: continue
        for s in sentences(p):
            core = re.sub(r'\d+([,.]\d+)?', '#', s.lower())
            if core in seen or len(s) < 25 or len(s) > 330: continue
            if DROP.search(s) or not KEEP.search(s): continue
            if suited and s.startswith(('Gebruik', 'U gebruikt')): continue
            seen.add(core); bullets.append(s)
    return suited, bullets[:max_bullets]
