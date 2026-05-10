import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CITY_INPUT_AUTOCOMPLETE, COUNTRIES, needsOnboarding, validateOnboarding } from "../../lib/domain/onboarding";

describe("onboarding", () => {
  it("requires onboarding when local player profile fields are missing", () => {
    assert.equal(needsOnboarding(null), true);
    assert.equal(needsOnboarding({ name: "Ayan", age: 21, country: "Казахстан", city: "Астана" }), false);
  });

  it("validates name, age, country, and manual city input", () => {
    const result = validateOnboarding({ name: "Ayan", age: 21, country: "Казахстан", city: "Астана" });

    assert.equal(result.ok, true);
    assert.equal(CITY_INPUT_AUTOCOMPLETE, "off");
    assert.ok(COUNTRIES.some((country) => country.name === "Казахстан"));
  });

  it("rejects unsupported countries and autocomplete-like empty city values", () => {
    const result = validateOnboarding({ name: "A", age: 8, country: "Atlantis", city: "" });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.errors, {
        name: "Имя должно быть не короче 2 символов.",
        age: "Возраст должен быть от 13 до 120.",
        country: "Выбери страну из списка.",
        city: "Город обязателен."
      });
    }
  });
});
