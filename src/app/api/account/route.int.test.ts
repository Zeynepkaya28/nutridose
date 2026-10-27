import { describe, expect, it } from "vitest";
import { adminClient, createTestUser } from "@/test/supabase-users";
import { DELETE } from "./route";

const admin = adminClient();

describe("DELETE /api/account", () => {
  it("401 without a session", async () => {
    const response = await DELETE(new Request("http://localhost/api/account", { method: "DELETE" }));
    expect(response.status).toBe(401);
  });

  it("deletes the caller's account with a Bearer token", async () => {
    const user = await createTestUser(admin);
    await user.client.from("meals").insert({ label: "Kahvaltı" });
    const response = await DELETE(
      new Request("http://localhost/api/account", { method: "DELETE", headers: { authorization: `Bearer ${user.accessToken}` } }),
    );
    expect(response.status).toBe(204);
    const { data } = await admin.auth.admin.getUserById(user.id);
    expect(data.user).toBeNull();
    const meals = await admin.from("meals").select("id").eq("user_id", user.id);
    expect(meals.data).toEqual([]);
  });
});
