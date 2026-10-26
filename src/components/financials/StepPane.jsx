import React from 'react';
import { MacButton } from './MacButtons';
import { MacGroup, MacRow } from './MacGroup';
import ItemRow from './ItemRow';

const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * One step, opened: its name, what it means, and its own documents or invoices as
 * rows. A step the job was taken past says what it is still waiting on, with the way
 * back into it; anything merely recommended is offered under its own heading.
 */
export default function StepPane({ step, claim, focus, onOpenItem, onAction, onContinue, onReopen, extra }) {
  if (!step) return null;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-[15px] font-semibold text-foreground">Step {step.n} · {step.title}</h2>
        <p className="text-[11px] text-mac-muted">{step.hint}</p>
        {step.movedPast && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">{step.line}</p>
        )}
      </header>

      {step.empty ? (
        <MacGroup>
          <MacRow className="flex-col items-start gap-0.5">
            <span className="text-[13px] text-foreground">{step.empty.title}</span>
            <span className="text-[11px] text-mac-muted">{step.empty.reasons.join(' · ')}</span>
          </MacRow>
        </MacGroup>
      ) : (
        <MacGroup>
          {step.rows.map(({ item, state }) => (
            <ItemRow
              key={item.key}
              item={item}
              state={state}
              claim={claim}
              focus={focus}
              onClick={() => onOpenItem(item, state)}
            />
          ))}
        </MacGroup>
      )}

      {step.suggestion && (
        <MacGroup>
          <MacRow>
            <span className="min-w-0 flex-1 text-[11px] text-mac-muted">
              {capitalise(step.suggestion.label)} — recommended, not required.
            </span>
            <MacButton onClick={() => onAction(step.suggestion)}>Upload</MacButton>
          </MacRow>
        </MacGroup>
      )}

      {extra}

      {(onContinue || onReopen) && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {onReopen && <MacButton onClick={onReopen}>Reopen this step</MacButton>}
          {onContinue && <MacButton onClick={onContinue}>Continue with these outstanding</MacButton>}
        </div>
      )}
    </div>
  );
}