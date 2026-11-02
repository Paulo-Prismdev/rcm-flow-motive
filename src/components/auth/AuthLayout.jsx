import React from 'react';

const RCM_LOGO = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

/**
 * The frame every sign-in screen sits in: the RCM logo on navy, a title, and one card.
 * Works at phone width with no sideways scrolling.
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#151d44] px-4 py-8">
      <img src={RCM_LOGO} alt="RCM Automotive" className="h-14 w-auto object-contain mb-8" />
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-gray-100 rounded-2xl shadow-xl border border-white/10 p-6 sm:p-8">
          <div className="text-center mb-6">
            {Icon && (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#151d44] mb-3">
                <Icon className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 break-words">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="text-center text-sm text-white/70 mt-6">{footer}</div>}
      </div>
    </main>
  );
}
