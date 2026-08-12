import { describe, expect, it } from "vitest";
import {
  hashCountry,
  hashEmail,
  hashExternalId,
  hashFirstName,
  hashLastName,
  hashPhone,
  hashZip,
  normalizeCountry,
  normalizeEmail,
  normalizePhone,
  normalizeZip,
} from "@/lib/meta/hash";

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

describe("hashFirstName/hashLastName — exemplo oficial Meta", () => {
  it("produz o SHA-256 esperado pela documentação oficial para 'Mary'", () => {
    expect(hashFirstName("Mary")).toBe(
      "6915771be1c5aa0c886870b6951b03d7eafc121fea0e80a5ea83beb7c449f4ec",
    );
  });

  it("divide um nome completo em primeiro nome + apelido (resto do nome)", () => {
    expect(hashFirstName("Mary Jane Watson")).toBe(hashFirstName("Mary"));
    // O apelido é TUDO o que sobra depois do primeiro token — "jane watson", não só "watson".
    expect(hashLastName("Mary Jane Watson")).toBe(
      "0f46ea7c178168610b66dc00f408e118a2f6ac3be1743c5bcc8e5da56fb14bc6",
    );
  });

  it("remove pontuação e mantém acentos (UTF-8)", () => {
    expect(hashLastName("Ana Valéry")).toBe(hashFirstName("Valéry"));
  });

  it("devolve undefined quando não há apelido (nome só com um token)", () => {
    expect(hashFirstName("Mary")).toBeDefined();
    expect(hashLastName("Mary")).toBeUndefined();
  });

  it("devolve undefined para nome vazio", () => {
    expect(hashFirstName("")).toBeUndefined();
    expect(hashLastName(null)).toBeUndefined();
  });
});

describe("hashCountry — exemplo oficial Meta", () => {
  it("normaliza para lowercase ISO 3166-1 alpha-2", () => {
    expect(normalizeCountry(" US ")).toBe("us");
  });

  it("produz o SHA-256 esperado pela documentação oficial", () => {
    expect(hashCountry("us")).toBe(
      "79adb2a2fce5c6ba215fe5f27f532d4e7edbac4b6a5e09e1ef3a08084a904621",
    );
  });

  it("rejeita valores que não sejam um código de 2 letras", () => {
    expect(hashCountry("United States")).toBeUndefined();
    expect(hashCountry("")).toBeUndefined();
  });
});

describe("hashZip", () => {
  it("normaliza para lowercase sem espaços/hífenes", () => {
    expect(normalizeZip("94040-1234")).toBe("940401234");
    expect(normalizeZip("SW1A 1AA")).toBe("sw1a1aa");
  });

  it("hashea de forma estável e determinística", () => {
    expect(hashZip("1000-001")).toBe(hashZip("1000 001"));
  });

  it("devolve undefined para código postal vazio", () => {
    expect(hashZip("")).toBeUndefined();
  });
});
