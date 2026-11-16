#!/usr/bin/env python3
"""Convert hard-coded Tailwind colour/size classes in className strings to Flowmotive tokens.
Usage: python3 fmmap.py file.jsx [...]   (edits in place, prints counts)
Rules: light class mapped -> its dark: twin dropped; text-[8-11px] -> text-xs; rounded-[10px] -> rounded-lg;
uppercase + tracking-* removed together; solid status fills -> bg-success/danger/info + text-on-solid."""
import re, sys

TONE = {'red':'danger','rose':'danger','green':'success','emerald':'success','teal':'success',
        'amber':'warning','yellow':'warning','orange':'warning','blue':'info','sky':'info','indigo':'info','cyan':'info'}
GREY = r'(?:gray|slate|zinc|neutral|stone)'

def map_light(cls):
    """Return replacement for an unprefixed (or state-prefixed) light class, or None."""
    m = re.fullmatch(r'((?:[a-z-]+:)*)(.+)', cls, re.S)
    if not m: return None
    pre, c = m.group(1), m.group(2)
    if 'dark:' in pre: return None
    r = None
    if c in ('bg-white',): r = 'bg-card'
    elif re.fullmatch(rf'bg-{GREY}-(50|100)(/\d+)?', c): r = 'bg-muted'
    elif re.fullmatch(rf'bg-{GREY}-(200|300)', c): r = 'bg-accent'
    elif re.fullmatch(rf'bg-{GREY}-(800|900|950)', c): r = 'bg-foreground'
    elif re.fullmatch(rf'text-{GREY}-(900|800|700)', c) or c == 'text-black': r = 'text-foreground'
    elif re.fullmatch(rf'text-{GREY}-(600|500|400)', c): r = 'text-muted-foreground'
    elif re.fullmatch(rf'text-{GREY}-(300|200)', c): r = 'text-muted-foreground/70'
    elif re.fullmatch(rf'(border|divide)(-[trblxy])?-{GREY}-(100|200|300)', c):
        r = re.sub(rf'-{GREY}-\d+', '-border', c)
    elif re.fullmatch(rf'ring-{GREY}-(100|200|300)', c): r = 'ring-border'
    elif re.fullmatch(r'(border|ring)(-[trblxy])?-(teal|blue|indigo)-(400|500|600)', c) and pre.startswith(('focus','hover')):
        r = re.sub(r'-(teal|blue|indigo)-\d+', '-ring', c)
    else:
        m2 = re.fullmatch(r'(bg|text|border)-(red|rose|green|emerald|teal|amber|yellow|orange|blue|sky|indigo|cyan)-(\d+)(/\d+)?', c)
        if m2:
            kind, col, n, alpha = m2.group(1), m2.group(2), int(m2.group(3)), m2.group(4) or ''
            t = TONE[col]
            if col == 'teal' and kind == 'text': return pre + 'text-link'
            if kind == 'bg' and n <= 100: r = f'bg-{t}-bg'
            elif kind == 'bg' and n in (500, 600, 700) and not alpha: r = f'bg-{t}'
            elif kind == 'bg' and n >= 400: r = f'bg-{t}{alpha}'
            elif kind == 'text' and n >= 500: r = f'text-{t}-fg'
            elif kind == 'border' and n <= 300: r = f'border-{t}/30'
            elif kind == 'border': r = f'border-{t}'
    return pre + r if r else None

def conv_classes(s):
    toks = s.split(' ')
    out, mapped_bases = [], set()
    for t in toks:
        if not t: out.append(t); continue
        r = map_light(t)
        if r is not None:
            base = re.sub(r'^((?:[a-z-]+:)*)', '', t)
            mapped_bases.add((re.match(r'((?:[a-z-]+:)*)', t).group(1), base.split('-')[0]))
            out.append(r)
        else: out.append(t)
    # drop dark: twins whose light property was mapped
    res = []
    for t in out:
        m = re.fullmatch(r'((?:[a-z-]+:)*)dark:((?:[a-z-]+:)*)((bg|text|border|ring|divide)(-[trblxy])?-[a-z]+-\d+(/\d+)?|bg-black(/\d+)?|text-white|bg-white(/\d+)?)', t)
        if m:
            pre = m.group(1) + m.group(2); prop = m.group(4) or m.group(3).split('-')[0]
            if (pre, prop) in mapped_bases or (m.group(1)+m.group(2), prop) in mapped_bases:
                continue
        res.append(t)
    s2 = ' '.join(res)
    tiny = re.search(r'(^| )(w-[456]|h-[456])( |$)', s2)
    s2 = re.sub(r'\btext-\[(8|9|10|11)px\]', 'text-[10px]' if tiny else 'text-xs', s2)
    if re.search(r'(^| )bg-foreground( |$)', s2):
        s2 = re.sub(r'(^| )text-white(?= |$)', r'\1text-background', s2)
    s2 = re.sub(r'\brounded-\[10px\]', 'rounded-lg', s2)
    s2 = re.sub(r'(^| )shadow-sm(?= |$)', r'\1shadow-card', s2)
    if all(re.search(rf'(^| ){c}( |$)', s2) for c in ('bg-card','shadow-card','rounded-lg')):
        s2 = re.sub(r'(^| )rounded-lg(?= |$)', r'\1rounded-xl', s2)
    if re.search(r'(^| )uppercase( |$)', s2) and re.search(r'(^| )tracking-[a-z\[\].0-9]+', s2):
        s2 = re.sub(r'(^| )uppercase(?= |$)', r'\1', s2); s2 = re.sub(r'(^| )tracking-[a-z\[\].0-9]+(?= |$)', r'\1', s2)
    if re.search(r'\bbg-(success|danger|info|warning)(?=[ "]|$)', s2):
        s2 = re.sub(r'(^| )text-white(?= |$)', r'\1text-on-solid', s2)
    return re.sub(r'(?<=\S)  +(?=\S)', ' ', s2)

def conv_template(body):
    # convert literal parts and quoted strings inside ${...}
    out, i = [], 0
    while i < len(body):
        j = body.find('${', i)
        if j < 0: out.append(conv_classes(body[i:])); break
        out.append(conv_classes(body[i:j]))
        depth, k = 1, j + 2
        while k < len(body) and depth:
            depth += {'{':1, '}':-1}.get(body[k], 0); k += 1
        inner = body[j+2:k-1]
        inner = re.sub(r"'([^'\n]*)'", lambda m: "'" + conv_classes(m.group(1)) + "'", inner)
        inner = re.sub(r'"([^"\n]*)"', lambda m: '"' + conv_classes(m.group(1)) + '"', inner)
        out.append('${' + inner + '}'); i = k
    return ''.join(out)

def process(src):
    n = [0]
    def rep_attr(m):
        n[0] += 1; return m.group(1) + conv_classes(m.group(2)) + m.group(3)
    src = re.sub(r'(className=")([^"]*)(")', rep_attr, src)
    src = re.sub(r"(className=')([^']*)(')", rep_attr, src)
    def rep_tpl(m):
        n[0] += 1; return '`' + conv_template(m.group(1)) + '`'
    # only template literals that are class lists: className={`...`} or cn(`...`)
    src = re.sub(r'(?<=className=\{)`([^`]*)`', rep_tpl, src)
    src = re.sub(r'(?<=cn\()`([^`]*)`', rep_tpl, src)
    # class strings in objects / ternaries: quoted strings that look like class lists
    def rep_q(m):
        q, body = m.group(1), m.group(2)
        if re.search(r'\b(bg|text|border)-[a-z]+-\d{2,3}\b|\btext-\[(8|9|10|11)px\]|bg-white\b', body):
            n[0] += 1; return q + conv_classes(body) + q
        return m.group(0)
    src = re.sub(r"(')([^'\n]{3,})'", rep_q, src)
    src = re.sub(r'(")([^"\n]{3,})"', rep_q, src)
    return src, n[0]

if __name__ == '__main__':
    for p in sys.argv[1:]:
        s = open(p).read(); t, n = process(s)
        if t != s: open(p, 'w').write(t)
        left = len(re.findall(rf'\b(?:bg|text|border)-(?:{GREY[3:-1]})-\d+', t))
        print(f'{p}: changed={t != s} leftover-grey={left}')
