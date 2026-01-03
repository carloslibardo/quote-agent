/**
 * Icon size constants for consistent icon sizing across the application.
 * Values correspond to Tailwind CSS size classes:
 * - xs: 16px (h-4 w-4)
 * - sm: 20px (h-5 w-5)
 * - md: 24px (h-6 w-6)
 * - lg: 32px (h-8 w-8)
 * - xl: 48px (h-12 w-12)
 * - 2xl: 64px (h-16 w-16)
 */

export const ICON_SIZES = {
  xs: "size-4",
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
  "2xl": "size-16",
} as const;

/**
 * Icon size in pixels for use in inline styles
 */
export const ICON_SIZES_PX = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  "2xl": 64,
} as const;

/**
 * Navigation bar icon size (24px / size-6)
 */
export const NAV_ICON_SIZE = ICON_SIZES.md;
export const NAV_ICON_SIZE_PX = ICON_SIZES_PX.md;
