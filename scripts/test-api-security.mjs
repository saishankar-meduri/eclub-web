import assert from "node:assert";
import { GET, POST, PUT, DELETE, PATCH } from "../app/api/admin/contacts/route.js";

async function runApiSecurityTests() {
  console.log("=== Testing /api/admin/contacts Security Checks ===");

  // 1. GET without authorization header
  const reqNoAuth = new Request("http://localhost/api/admin/contacts", {
    method: "GET",
  });
  const resNoAuth = await GET(reqNoAuth);
  assert.strictEqual(resNoAuth.status, 401, "GET without token must return 401");
  const jsonNoAuth = await resNoAuth.json();
  assert.strictEqual(jsonNoAuth.error, "Not signed in");
  console.log("✓ GET without token rejected with 401 Not signed in");

  // 2. GET with fake Bearer token
  const reqFakeAuth = new Request("http://localhost/api/admin/contacts", {
    method: "GET",
    headers: { Authorization: "Bearer fake-token-12345" },
  });
  const resFakeAuth = await GET(reqFakeAuth);
  assert.strictEqual(resFakeAuth.status, 401, "GET with invalid token must return 401");
  console.log("✓ GET with invalid token rejected with 401 Invalid token");

  // 3. POST without token
  const reqPostNoAuth = new Request("http://localhost/api/admin/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hacker", designation: "None" }),
  });
  const resPostNoAuth = await POST(reqPostNoAuth);
  assert.strictEqual(resPostNoAuth.status, 401, "POST without token must return 401");
  console.log("✓ POST without token rejected with 401 Not signed in");

  // 4. PUT without token
  const reqPutNoAuth = new Request("http://localhost/api/admin/contacts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "123", name: "Hacker" }),
  });
  const resPutNoAuth = await PUT(reqPutNoAuth);
  assert.strictEqual(resPutNoAuth.status, 401, "PUT without token must return 401");
  console.log("✓ PUT without token rejected with 401 Not signed in");

  // 5. DELETE without token
  const reqDelNoAuth = new Request("http://localhost/api/admin/contacts", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "123" }),
  });
  const resDelNoAuth = await DELETE(reqDelNoAuth);
  assert.strictEqual(resDelNoAuth.status, 401, "DELETE without token must return 401");
  console.log("✓ DELETE without token rejected with 401 Not signed in");

  // 6. PATCH without token
  const reqPatchNoAuth = new Request("http://localhost/api/admin/contacts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ id: "123", order: 1 }] }),
  });
  const resPatchNoAuth = await PATCH(reqPatchNoAuth);
  assert.strictEqual(resPatchNoAuth.status, 401, "PATCH without token must return 401");
  console.log("✓ PATCH without token rejected with 401 Not signed in");

  console.log("=== All API Security Tests Passed! ===");
}

runApiSecurityTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

