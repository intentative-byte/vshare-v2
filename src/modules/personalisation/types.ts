export type Preferences = {
  personalisationEnabled: boolean;
  analyticsConsent: "unset" | "granted" | "denied";
  /** How long a learning session should be, in minutes. */
  sessionMinutes: number;
};
