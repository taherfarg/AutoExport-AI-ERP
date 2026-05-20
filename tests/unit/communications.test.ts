import { describe, expect, test } from "vitest";
import {
  compileTemplate,
  validateProviderConfig,
} from "@/lib/crm/communications";

describe("communications domain helpers", () => {
  describe("compileTemplate", () => {
    test("replaces placeholders with variables", () => {
      const template = "Hello {{customer_name}}, your order for {{vehicle_model}} is ready!";
      const variables = {
        customer_name: "John Doe",
        vehicle_model: "2026 Toyota Hilux",
      };
      expect(compileTemplate(template, variables)).toBe(
        "Hello John Doe, your order for 2026 Toyota Hilux is ready!"
      );
    });

    test("handles missing variables by keeping the placeholder", () => {
      const template = "Hello {{customer_name}}, check your {{missing_var}}.";
      const variables = {
        customer_name: "Jane",
      };
      expect(compileTemplate(template, variables)).toBe(
        "Hello Jane, check your {{missing_var}}."
      );
    });

    test("handles empty variables dictionary", () => {
      const template = "Hello {{customer_name}}.";
      expect(compileTemplate(template, {})).toBe("Hello {{customer_name}}.");
    });
  });

  describe("validateProviderConfig", () => {
    test("validates whatsapp configuration", () => {
      expect(
        validateProviderConfig("whatsapp", {
          phoneNumberId: "12345",
          accessToken: "secret_token",
        })
      ).toBe(true);

      expect(
        validateProviderConfig("whatsapp", {
          phoneNumberId: "",
          accessToken: "secret_token",
        })
      ).toBe(false);

      expect(validateProviderConfig("whatsapp", {})).toBe(false);
    });

    test("validates email configuration", () => {
      expect(
        validateProviderConfig("email", {
          apiKey: "SG.key_here",
        })
      ).toBe(true);

      expect(
        validateProviderConfig("email", {
          smtpHost: "smtp.example.com",
          smtpPort: 587,
          smtpUser: "user",
          smtpPass: "pass",
        })
      ).toBe(true);

      expect(validateProviderConfig("email", {})).toBe(false);
    });

    test("validates sms configuration", () => {
      expect(
        validateProviderConfig("sms", {
          accountSid: "AC123",
          authToken: "auth_token",
          fromNumber: "+1234567890",
        })
      ).toBe(true);

      expect(
        validateProviderConfig("sms", {
          accountSid: "AC123",
        })
      ).toBe(false);
    });

    test("returns false for unknown provider type", () => {
      expect(validateProviderConfig("invalid_type", {})).toBe(false);
    });
  });
});
