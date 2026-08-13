import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Phone, Mail, MessageCircle, Smartphone } from 'lucide-react';

const DIRECTION_STYLES = {
  Incoming: { icon: ArrowDownLeft, classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  Outgoing: { icon: ArrowUpRight, classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

const PLATFORM_META = {
  'Phone': { icon: Phone },
  'E-Mail': { icon: Mail },
  'Whatsapp': { icon: MessageCircle },
  'Text Message': { icon: Smartphone },
};

export default function UpdateDirectionBadges({ update }) {
  if (!update) return null;
  const hasDirection = !!update.direction;
  const hasPlatform = !!update.platform;
  if (!hasDirection && !hasPlatform) return null;

  const dir = hasDirection ? DIRECTION_STYLES[update.direction] : null;
  const DirIcon = dir?.icon;
  const plat = hasPlatform ? PLATFORM_META[update.platform] : null;
  const PlatIcon = plat?.icon;

  return (
    <div className="inline-flex items-center gap-1.5">
      {hasDirection && (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${dir.classes}`}>
          {DirIcon && <DirIcon className="w-3 h-3" />}
          {update.direction}
        </span>
      )}
      {hasPlatform && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
          {PlatIcon && <PlatIcon className="w-3 h-3" />}
          {update.platform}
        </span>
      )}
    </div>
  );
}