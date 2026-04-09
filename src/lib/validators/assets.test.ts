import { describe, expect, it } from "vitest";

import {
  assetCreateSchema,
  assetUpdateSchema,
  parseAssetMultipartRequest,
} from "@/lib/validators/assets";

describe("parseAssetMultipartRequest", () => {
  it("parses multipart asset payload with kept ids and new images", async () => {
    const formData = new FormData();

    formData.set(
      "payload",
      JSON.stringify({
        assetCode: "nb-1001",
        name: "Notebook Dell Latitude 5440",
        totalQty: 1,
      }),
    );
    formData.set("keptImageIds", JSON.stringify([1, 2]));
    formData.append("newImages", new File(["image"], "photo.png", { type: "image/png" }));

    const request = new Request("http://localhost/api/assets", {
      method: "POST",
      body: formData,
    });

    const result = await parseAssetMultipartRequest(request, assetCreateSchema);

    expect(result.input.assetCode).toBe("NB-1001");
    expect(result.input.name).toBe("Notebook Dell Latitude 5440");
    expect(result.keptImageIds).toEqual([1, 2]);
    expect(result.newImages).toHaveLength(1);
  });

  it("rejects unsupported file types", async () => {
    const formData = new FormData();

    formData.set("payload", JSON.stringify({ status: "maintenance" }));
    formData.set("keptImageIds", JSON.stringify([]));
    formData.append("newImages", new File(["gif"], "photo.gif", { type: "image/gif" }));

    const request = new Request("http://localhost/api/assets/1", {
      method: "PATCH",
      body: formData,
    });

    await expect(parseAssetMultipartRequest(request, assetUpdateSchema)).rejects.toThrow(
      "Asset images must be JPG, PNG, or WebP",
    );
  });
});
