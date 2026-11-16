"""Round 4 helper: converts one-off Tailwind colour classes to the Flowmotive design
tokens, class string by class string, so dark mode keeps working. Only class names
change; no logic. Usage: python3 fmmap.py file.jsx [...]"""
import re, sys

STR = re.compile(r'(className=|cls\s*=\s*|cn\()?("([^"\n]*)"|`([^`]*)`|\'([^\'\n]*)\')')

LIGHT = [
    (r'bg-white', 'bg-card', 'bg'), (r'bg-gray-50', 'bg-muted', 'bg'), (r'bg-gray-50/50', 'bg-muted/50', 'bg'),
    (r'bg-gray-100', 'bg-muted', 'bg'), (r'bg-gray-200', 'bg-accent', 'bg'), (r'bg-slate-50', 'bg-muted', 'bg'),
    (r'hover:bg-gray-50', 'hover:bg-accent', 'hbg'), (r'hover:bg-gray-100', 'hover:bg-accent', 'hbg'),
    (r'hover:bg-gray-200', 'hover:bg-accent', 'hbg'), (r'hover:bg-white', 'hover:bg-card', 'hbg'),
    (r'text-gray-900', 'text-foreground', 'text'), (r'text-gray-800', 'text-foreground', 'text'),
    (r'text-gray-700', 'text-foreground', 'text'), (r'text-gray-600', 'text-muted-foreground', 'text'),
    (r'text-gray-500', 'text-muted-foreground', 'text'), (r'text-gray-400', 'text-muted-foreground', 'text'),
    (r'text-gray-300', 'text-ink-subtle', 'text'), (r'text-slate-500', 'text-muted-foreground', 'text'),
    (r'text-slate-600', 'text-muted-foreground', 'text'), (r'text-slate-900', 'text-foreground', 'text'),
    (r'hover:text-gray-600', 'hover:text-foreground', 'htext'), (r'hover:text-gray-700', 'hover:text-foreground', 'htext'),
    (r'hover:text-gray-900', 'hover:text-foreground', 'htext'), (r'hover:text-gray-800', 'hover:text-foreground', 'htext'),
    (r'border-gray-100', 'border-border', 'border'), (r'border-gray-200', 'border-border', 'border'),
    (r'border-gray-300', 'border-input', 'border'), (r'hover:border-gray-300', 'hover:border-input', 'hborder'),
    (r'divide-gray-100', 'divide-border', 'divide'), (r'divide-gray-200', 'divide-border', 'divide'),
    (r'placeholder-gray-400', 'placeholder:text-ink-subtle', 'ph'), (r'placeholder:text-gray-400', 'placeholder:text-ink-subtle', 'ph'),
    (r'focus:border-blue-400', 'focus:border-ring', 'focus'), (r'focus:border-blue-500', 'focus:border-ring', 'focus'),
    (r'focus:ring-blue-500/15', 'focus:ring-ring/20', 'focus'), (r'focus:ring-blue-500', 'focus:ring-ring', 'focus'),
    (r'focus:border-teal-500', 'focus:border-ring', 'focus'),
    # tones (light tints and their text)
    (r'bg-blue-50', 'bg-info-bg', 'bg'), (r'bg-blue-100', 'bg-info-bg', 'bg'), (r'text-blue-600', 'text-info-fg', 'text'),
    (r'text-blue-700', 'text-info-fg', 'text'), (r'text-blue-800', 'text-info-fg', 'text'), (r'border-blue-200', 'border-info/30', 'border'),
    (r'bg-red-50', 'bg-danger-bg', 'bg'), (r'bg-red-100', 'bg-danger-bg', 'bg'), (r'text-red-600', 'text-danger-fg', 'text'),
    (r'text-red-700', 'text-danger-fg', 'text'), (r'text-red-800', 'text-danger-fg', 'text'), (r'border-red-200', 'border-danger/30', 'border'),
    (r'bg-green-50', 'bg-success-bg', 'bg'), (r'bg-green-100', 'bg-success-bg', 'bg'), (r'text-green-600', 'text-success-fg', 'text'),
    (r'text-green-700', 'text-success-fg', 'text'), (r'text-green-800', 'text-success-fg', 'text'), (r'border-green-200', 'border-success/30', 'border'),
    (r'bg-emerald-50', 'bg-success-bg', 'bg'), (r'text-emerald-700', 'text-success-fg', 'text'), (r'text-emerald-600', 'text-success-fg', 'text'),
    (r'bg-amber-50', 'bg-warning-bg', 'bg'), (r'bg-amber-100', 'bg-warning-bg', 'bg'), (r'text-amber-600', 'text-warning-fg', 'text'),
    (r'text-amber-700', 'text-warning-fg', 'text'), (r'text-amber-800', 'text-warning-fg', 'text'), (r'border-amber-200', 'border-warning/40', 'border'),
    (r'border-amber-300', 'border-warning/50', 'border'), (r'bg-yellow-50', 'bg-warning-bg', 'bg'), (r'text-yellow-700', 'text-warning-fg', 'text'),
    (r'text-yellow-800', 'text-warning-fg', 'text'), (r'bg-orange-50', 'bg-warning-bg', 'bg'), (r'text-orange-700', 'text-warning-fg', 'text'),
    (r'text-orange-600', 'text-warning-fg', 'text'),
]
LMAP = {a: (b, k) for a, b, k in LIGHT}
TOKENISH = {'bg-card', 'bg-muted', 'bg-accent', 'bg-background', 'bg-muted/50', 'bg-info-bg', 'bg-danger-bg', 'bg-success-bg', 'bg-warning-bg', 'bg-neutral-bg'}
DARK = {
    'bg': re.compile(r'^dark:bg-(gray|slate|blue|red|green|emerald|amber|yellow|orange)-\d+(/\d+)?$'),
    'hbg': re.compile(r'^dark:hover:bg-(gray|slate|blue|red|green|amber)-\d+(/\d+)?$'),
    'text': re.compile(r'^dark:text-(white|(gray|slate|blue|red|green|emerald|amber|yellow|orange)-\d+)$'),
    'htext': re.compile(r'^dark:hover:text-(white|gray-\d+)$'),
    'border': re.compile(r'^dark:border-(gray|slate|blue|red|green|amber|yellow)-\d+(/\d+)?$'),
    'hborder': re.compile(r'^dark:hover:border-gray-\d+$'),
    'divide': re.compile(r'^dark:divide-gray-\d+$'),
    'ph': re.compile(r'^dark:placeholder-gray-\d+$'),
}
SMALL = re.compile(r'^((?:[a-z]+:)*)text-\[(8|9|10|11)px\]$')

def convert_tokens(s):
    toks = s.split(' ')
    kinds = set()
    out = []
    for t in toks:
        if t in LMAP:
            new, k = LMAP[t]; out.append(new); kinds.add(k); continue
        m = SMALL.match(t)
        if m: out.append(m.group(1) + 'text-xs'); continue
        if t == 'rounded-[10px]': out.append('rounded-lg'); continue
        out.append(t)
    # a light colour now from the tokens: its dark twin is no longer needed
    final = []
    for t in out:
        drop = False
        for k, rx in DARK.items():
            if k in kinds and rx.match(t): drop = True; break
        if not drop: final.append(t)
    joined = ' '.join(final)
    # capital-letter labels become sentence case
    if re.search(r'(^| )uppercase( |$)', joined) and re.search(r'(^| )tracking-(wide|wider|widest)( |$)', joined):
        joined = re.sub(r'(^| )uppercase(?= |$)', r'\1', joined)
        joined = re.sub(r'(^| )tracking-(wide|wider|widest)(?= |$)', r'\1', joined)
        joined = re.sub(r'  +', ' ', joined).strip()
    return joined

def convert_text(src):
    def rep(m):
        whole = m.group(0); q = m.group(2)
        body = q[1:-1]
        if '${' in body:
            # template literal: convert the static pieces between ${...}
            parts = re.split(r'(\$\{[^}]*\})', body)
            parts = [p if p.startswith('${') else ' '.join(convert_tokens(x) if x else x for x in p.split(' ')) if False else _conv_piece(p) for p in parts]
            nb = ''.join(parts)
        else:
            nb = _conv_piece(body)
        return whole.replace(q, q[0] + nb + q[-1], 1)
    return STR.sub(rep, src)

def _conv_piece(p):
    if not p.strip():
        return p
    lead = p[:len(p) - len(p.lstrip())]; trail = p[len(p.rstrip()):]
    return lead + convert_tokens(p.strip()) + trail

if __name__ == '__main__':
    for f in sys.argv[1:]:
        s = open(f).read(); n = convert_text(s)
        if n != s:
            open(f, 'w').write(n)
            print('converted', f)
        else:
            print('unchanged', f)
