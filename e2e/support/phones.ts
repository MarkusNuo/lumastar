import { devices } from '@playwright/test';

export interface Phone {
  userAgent: string;
  defaultBrowserType: 'chromium';
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

/** A Chromium Android phone with the given CSS viewport, touch and a 2x display. */
function androidPhone(width: number, height: number): Phone {
  return {
    userAgent: devices['Pixel 7'].userAgent,
    defaultBrowserType: 'chromium',
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  };
}

/** Mobile-first range of PRD 12 (360–430 px): the common size and the narrowest one. */
export const PHONES = {
  'phone-390': androidPhone(390, 844),
  'phone-360': androidPhone(360, 740),
} as const satisfies Record<string, Phone>;
