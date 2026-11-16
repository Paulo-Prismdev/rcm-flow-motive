#!/usr/bin/env python3
"""Round 1 made --accent the light hover tint (shadcn convention). Older screens used
accent to mean RCM navy. Move those uses to primary; keep hover/focus tints as accent."""
import re, sys, pathlib
changed = 0
for p in pathlib.Path('src').rglob('*.js*'):
    if 'components/ui' in str(p): continue
    s = p.read_text(); o = s
    # whole class strings first: solid accent buttons -> solid primary
    def fix_str(m):
        t = m.group(0)
        if re.search(r'(?<![:\w-])bg-accent(?![\w/-])', t) and re.search(r'(?<![:\w-])text-(accent-foreground|white|on-solid)(?![\w/-])', t):
            t = re.sub(r'(?<![:\w-])bg-accent(?![\w/-])', 'bg-primary', t)
            t = re.sub(r'(?<![:\w-])text-(accent-foreground|white|on-solid)(?![\w/-])', 'text-primary-foreground', t)
            t = re.sub(r'hover:bg-accent/90', 'hover:bg-primary/90', t)
        return t
    s = re.sub(r'"[^"\n]*accent[^"\n]*"|\'[^\'\n]*accent[^\'\n]*\'|`[^`]*accent[^`]*`', fix_str, s)
    # colour-meaning uses (any prefix): text/border/ring accent, and accent tints with alpha
    s = re.sub(r'(?<=[\s"\'`:])text-accent(?![\w-])', 'text-primary', s)
    s = re.sub(r'(?<=[\s"\'`:])(border|ring|outline|fill|stroke)-accent(?=[\s"\'`/])', r'\1-primary', s)
    s = re.sub(r'(?<=[\s"\'`:])bg-accent/(\d+)', r'bg-primary/\1', s)
    if s != o:
        p.write_text(s); changed += 1; print(p)
print('files changed:', changed)
