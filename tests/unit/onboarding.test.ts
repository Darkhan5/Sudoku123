import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE, KAZAKHSTAN_CITIES, needsOnboarding, validateOnboarding } from "../../lib/domain/onboarding";

describe("onboarding", () => {
  it("requires onboarding when local player profile fields are missing", () => {
    assert.equal(needsOnboarding(null), true);
    assert.equal(needsOnboarding({ name: "Ayan", age: 21, country: "", city: "Астана" }), false);
  });

  it("offers 21 Kazakhstan cities in alphabetical order", () => {
    assert.equal(KAZAKHSTAN_CITIES.length, 21);
    assert.equal(KAZAKHSTAN_CITIES[0], "Актау");
    assert.equal(KAZAKHSTAN_CITIES.at(-1), "Экибастуз");
  });

  it("validates name, age, and a city from the Kazakhstan city list", () => {
    const result = validateOnboarding({ name: "Ayan", age: 21, city: "Астана" });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.profile.country, DEFAULT_COUNTRY);
      assert.equal(result.countryCode, DEFAULT_COUNTRY_CODE);
      assert.equal(result.profile.city, "Астана");
    }
  });

  it("normalizes legacy city aliases", () => {
    const result = validateOnboarding({ name: "Ayan", age: 21, city: "Astana" });

    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.profile.city, "Астана");
  });

  it("rejects invalid profile data and cities outside the Kazakhstan list", () => {
    const result = validateOnboarding({ name: "A", age: 8, country: "Atlantis", city: "Paris" });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.errors, {
        name: "Имя должно быть не короче 2 символов.",
        age: "Возраст должен быть от 13 до 120.",
        city: "Выбери город из списка."
      });
    }
  });
});
