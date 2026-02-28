/**
 * Validates IANA timezone format
 * Uses a regex pattern to match valid IANA timezone identifiers
 *
 * Examples of valid timezones:
 * - Australia/Sydney
 * - America/New_York
 * - Europe/London
 * - Asia/Tokyo
 * - UTC
 * - Etc/GMT+10
 */
export const isValidTimezone = (timezone: string): boolean => {
  if (!timezone || typeof timezone !== "string") {
    return false;
  }

  // Basic IANA timezone validation regex
  // Matches patterns like: Area/Location, Area/Location/Sublocation, UTC, Etc/GMT±offset
  const ianaTimezoneRegex =
    /^(?:[A-Za-z_]+(?:\/[A-Za-z_]+)+(?:\/[A-Za-z_]+)*|UTC|Etc\/GMT[+-]\d{1,2})$/;

  return ianaTimezoneRegex.test(timezone);
};

/**
 * List of common IANA timezones for validation hints
 * This is not exhaustive but covers the most commonly used timezones
 */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Africa/Cairo",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Mexico_City",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Europe/Moscow",
  "America/Argentina/Buenos_Aires",
] as const;

/**
 * Validates timezone and provides helpful error message if invalid
 */
export const validateTimezone = (
  timezone: string | undefined,
): string | null => {
  if (!timezone) {
    return null; // Optional field
  }

  if (!isValidTimezone(timezone)) {
    return `Invalid timezone format. Expected IANA timezone format (e.g., Australia/Sydney, America/New_York, UTC)`;
  }

  return null;
};
