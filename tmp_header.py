import sys
P = 'src/components/claims/ClaimDetail.jsx'
s = open(P).read()

A = '                  <div className="flex items-start gap-3">\n                      <button aria-label="Back"'
B = "                  {/* Where it's at: the stage in the client's words, the same track as the phone */}"
a = s.index(A); b = s.index(B, a)
block = s[a:b]

BTN_OPEN = '                      <div className="flex items-center gap-1.5 flex-shrink-0">\n'
bo = block.index(BTN_OPEN) + len(BTN_OPEN)
bc = block.index('                      </div>\n                  </div>\n                  <div className="flex items-center gap-2 flex-wrap">', bo)
buttons = block[bo:bc]
ST_OPEN = '                  <div className="flex items-center gap-2 flex-wrap">\n'
so = block.index(ST_OPEN) + len(ST_OPEN)
sc = block.rindex('                  </div>\n')
statuses = block[so:sc]

def rep(t, a, b, n=None):
    c = t.count(a)
    if c == 0 or (n is not None and c != n):
        sys.exit(f'{c} x {a!r}')
    return t.replace(a, b)

# Slightly smaller buttons
buttons = rep(buttons, 'h-9 px-3 text-sm font-medium gap-1.5', 'h-8 px-2.5 text-[13px] font-medium gap-1.5')
buttons = rep(buttons, 'h-9 px-3.5 text-sm font-medium gap-1.5', 'h-8 px-3 text-[13px] font-medium gap-1.5')
buttons = rep(buttons, 'className="p-2 h-9 w-9"', 'className="p-0 h-8 w-8"', 1)
# Narrower screens: the secondary buttons show their icon and count only (name on hover).
for icon, label in (('Eye', 'Quick view'), ('Image', 'Images'), ('FileText', 'Docs'), ('Edit', 'Internal updates')):
    buttons = rep(buttons, f'<{icon} className="w-4 h-4" /> {label}', f'<{icon} className="w-3.5 h-3.5" /> <span className="max-2xl:sr-only">{label}</span>', 1)
for fn, label in (('setIsQuickViewOpen(true)', 'Quick view'), ('setIsImagesOpen(true)', 'Images'), ('setIsAttachmentsOpen(true)', 'Docs'), ('setIsNotesOpen(true)', 'Internal updates')):
    buttons = rep(buttons, f'<Button onClick={{() => {fn}}} variant="outline"', f'<Button onClick={{() => {fn}}} title="{label}" variant="outline"', 1)
# The menu's Declaration of need now lives on Signed forms
buttons = rep(buttons, "setSelectedSection('declarationOfNeed')", "setSelectedSection('signedForms')", 1)

new = f'''                  {{/* Left: who and what, given the room to stand out. Right: actions, with the
                      statuses tucked underneath them. */}}
                  <div className="flex items-start gap-4">
                      <button aria-label="Back"
                        onClick={{handleClose}}
                        className="mt-1 p-2 flex-shrink-0 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                      >
                          <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <h1 className="flex-shrink-0 rounded-lg bg-primary text-primary-foreground px-3.5 py-1 text-[26px] font-bold tracking-[0.08em] tabular-nums leading-tight shadow-card">
                              {{claim.reg || 'No reg'}}
                            </h1>
                            <div className="min-w-0">
                              <p className="text-xl font-bold tracking-tight leading-tight truncate">{{claim.client_name || 'No client name'}}</p>
                              <p className="text-[13px] text-muted-foreground truncate tabular-nums mt-0.5">
                                {{[claim.job_number, claim.make_model].filter(Boolean).join(' · ')}}
                              </p>
                            </div>
                          </div>
                          {{/* Claim type, who authorises, their claim number */}}
                          <div className="mt-2.5"><AuthorisingPartyBanner claim={{claim}} caption /></div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
{buttons}                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
{statuses}                        </div>
                      </div>
                  </div>
'''
s = s[:a] + new + s[b:]
# A slimmer stage track
s = rep(s, '                  <div className="rounded-xl bg-muted/50 px-4 py-3">\n                    <ClaimStageTrack claim={claim} />', '                  <div className="rounded-xl bg-muted/50 px-4 py-2.5">\n                    <ClaimStageTrack claim={claim} />', 1)
open(P, 'w').write(s)
print('ok')
