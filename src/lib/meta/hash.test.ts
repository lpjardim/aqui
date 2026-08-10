import { describe, expect, it } from "vitest";
import { hashEmail, hashExternalId, hashPhone, normalizeEmail, normalizePhone } from "@/lib/meta/hash";

// Exemplos oficiais da documentação Meta ("Customer Information Parameters"):
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
describe("hashEmail — exemplo oficial Meta", () => {
  it("normaliza (trim + lowercase) antes de hashear", () => {
    expect(normalizeEmail(" John_Smith@gmail.com ")).toBe("john_smith@gmail.com");
  });

  it("produz o SHA-256 esperado pela documentação oficial", () => {
    expect(hashEmail("John_Smith@gmail.com")).toBe(
      "62a14e44f765419d10fea99367361a727c12365e2520f32218d505ed9aa0f62f",
    );
  });

  it("devolve undefined para email vazio", () => {
    expect(hashEmail("")).toBeUndefined();
    expect(hashEmail(null)).toBeUndefined();
    expect(hashEmail(undefined)).toBeUndefined();
  });
});

describe("hashPhone — exemplo oficial Meta (EUA)", () => {
  it("normaliza para só dígitos com indicativo de país", () => {
    expect(normalizePhone("(650)555-1212")).toBe("6505551212");
  });

  it("produz o SHA-256 esperado para um número já com indicativo", () => {
    expect(hashPhone("16505551212")).toBe(
      "e323ec626319ca94ee8bff2e4c87cf613be6ea19919ed1364124e16807ab3176",
    );
  });

  it("assume indicativo 351 (PT) para telemóveis de 9 dígitos a começar por 9", () => {
    expect(normalizePhone("912345678")).toBe("351912345678");
    expect(normalizePhone("+351 912 345 678")).toBe("351912345678");
    expect(normalizePhone("00351 912345678")).toBe("351912345678");
  });

  it("devolve undefined para telefone vazio ou demasiado curto", () => {
    expect(hashPhone("")).toBeUndefined();
    expect(hashPhone("123")).toBeUndefined();
  });
});

describe("hashExternalId", () => {
  it("hashea de forma estável e determinística", () => {
    const a = hashExternalId("user_123");
    const b = hashExternalId("user_123");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("devolve undefined para id vazio", () => {
    expect(hashExternalId("")).toBeUndefined();
  });
});
