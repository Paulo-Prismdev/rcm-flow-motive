import { Calculator, PoundSterling, Send, Upload } from 'lucide-react';

/** What the button says and shows, by the kind of thing to do next. */
export const ACTION_META = {
  upload: { label: 'Upload the file', icon: Upload },
  request: { label: 'Request from accounts', icon: Send },
  figures: { label: 'Go to job figures', icon: Calculator },
  pay: { label: 'Mark as paid', icon: PoundSterling },
};