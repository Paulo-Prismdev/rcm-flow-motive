import React, { forwardRef } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// Six boxes for a one-time code. Large enough to tap on a phone, and it offers the code
// from the email where the device can. onComplete fires as soon as the sixth digit is in.
const OtpField = forwardRef(function OtpField({ value, onChange, onComplete, disabled, label = 'One-time code', autoFocus = true }, ref) {
  return (
    <InputOTP
      ref={ref}
      maxLength={6}
      value={value}
      onChange={(v) => onChange(v.replace(/\D/g, ''))}
      onComplete={onComplete}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-label={label}
      containerClassName="justify-center"
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg sm:w-12" />)}
      </InputOTPGroup>
    </InputOTP>
  );
});

export default OtpField;
