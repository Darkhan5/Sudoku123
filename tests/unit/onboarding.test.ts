import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CITY_INPUT_AUTOCOMPLETE, DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE, needsOnboarding, validateOnboarding } from "../../lib/domain/onboarding";

describe("onboarding", () => {
  it("requires onboarding when local player profile fields are missing", () => {
    assert.equal(needsOnboarding(null), true);
    assert.equal(needsOnboarding({ name: "Ayan", age: 21, country: "", city: "Астана" }), false);
  });

  it("validates name, age, and manual city input without a country picker", () => {
    const result = validateOnboarding({ name: "Ayan", age: 21, city: "Астана" });

    assert.equal(result.ok, true);
    assert.equal(CITY_INPUT_AUTOCOMPLETE, "off");
    if (result.ok) {
      assert.equal(result.profile.country, DEFAULT_COUNTRY);
      assert.equal(result.countryCode, DEFAULT_COUNTRY_CODE);
    }
  });

  it("rejects invalid profile data and autocomplete-like empty city values", () => {
    const result = validateOnboarding({ name: "A", age: 8, country: "Atlantis", city: "" });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.errors, {
        name: "Имя должно быть не короче 2 символов.",
        age: "Возраст должен быть от 13 до 120.",
        city: "Город обязателен."
      });
    }
  });
});
