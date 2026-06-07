import { describe, it, expect } from "vitest";
import { successEmbed, errorEmbed, confirmEmbed } from "./embeds";

describe("embeds", () => {
  describe("successEmbed", () => {
    it("creates an embed with green color and the given title/description", () => {
      const embed = successEmbed("Done", "It worked.");

      expect(embed.data.title).toBe("Done");
      expect(embed.data.description).toBe("It worked.");
      expect(embed.data.color).toBe(0x2ecc71);
    });
  });

  describe("errorEmbed", () => {
    it("creates an embed with red color and the given title/description", () => {
      const embed = errorEmbed("Oops", "Something broke.");

      expect(embed.data.title).toBe("Oops");
      expect(embed.data.description).toBe("Something broke.");
      expect(embed.data.color).toBe(0xe74c3c);
    });
  });

  describe("confirmEmbed", () => {
    it("creates an embed with amber color and the given title/description", () => {
      const embed = confirmEmbed("Are you sure?", "This will delete everything.");

      expect(embed.data.title).toBe("Are you sure?");
      expect(embed.data.description).toBe("This will delete everything.");
      expect(embed.data.color).toBe(0xf39c12);
    });
  });
});
