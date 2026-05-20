/**
 * Compiles a template text body replacing placeholders of style {{variable}} with their value.
 */
export function compileTemplate(
  bodyText: string,
  variables: Record<string, string> = {}
): string {
  if (!bodyText) return "";
  return bodyText.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

/**
 * Validates configuration schema based on communication provider type.
 */
export function validateProviderConfig(
  type: string,
  config: Record<string, unknown> = {}
): boolean {
  if (!type || !config) return false;

  const getStr = (val: unknown): string => {
    return typeof val === "string" ? val.trim() : "";
  };

  switch (type) {
    case "whatsapp": {
      const phoneNumberId = getStr(config.phoneNumberId);
      const accessToken = getStr(config.accessToken);
      return phoneNumberId.length > 0 && accessToken.length > 0;
    }
    case "email": {
      const apiKey = getStr(config.apiKey);
      if (apiKey.length > 0) return true;

      const smtpHost = getStr(config.smtpHost);
      const smtpPort = config.smtpPort;
      const smtpUser = getStr(config.smtpUser);
      const smtpPass = getStr(config.smtpPass);

      return (
        smtpHost.length > 0 &&
        typeof smtpPort === "number" &&
        smtpPort > 0 &&
        smtpUser.length > 0 &&
        smtpPass.length > 0
      );
    }
    case "sms": {
      const accountSid = getStr(config.accountSid);
      const authToken = getStr(config.authToken);
      const fromNumber = getStr(config.fromNumber);
      return (
        accountSid.length > 0 &&
        authToken.length > 0 &&
        fromNumber.length > 0
      );
    }
    default:
      return false;
  }
}
