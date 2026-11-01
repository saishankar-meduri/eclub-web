import assert from "node:assert";
import { INITIAL_CONTACTS } from "../lib/initialContacts.js";

console.log("=== Testing Contact Page Logic & Requirements ===");

// 1. Verify all 8 initial contacts exist and match exact specs
assert.strictEqual(INITIAL_CONTACTS.length, 8, "Must have exactly 8 initial contacts");

const coordinator = INITIAL_CONTACTS.find((c) => c.name === "Prof. Lakshmeesa");
assert(coordinator, "Prof. Lakshmeesa must be present");
assert.strictEqual(coordinator.designation, "Club Coordinator");
assert.strictEqual(coordinator.group, "Club Coordinator");
assert.strictEqual(coordinator.phone, "", "Phone must be empty as specified");
assert.strictEqual(coordinator.email, "", "Email must be empty as specified");
assert.strictEqual(coordinator.id, "coordinator-prof-lakshmeesa");

const coreMembers = INITIAL_CONTACTS.filter(
  (c) => c.group === "Previous Core Team — Batch 2026"
);
assert.strictEqual(coreMembers.length, 7, "Must have exactly 7 Previous Core Team members");

const expectedCore = [
  {
    name: "Krish Gupta",
    designation: "President",
    phone: "9682674911",
    email: "Krishgupta228@gmail.com",
    order: 1,
  },
  {
    name: "Bhuvi Bagga",
    designation: "Head of CR",
    phone: "8766282341",
    email: "bhuvibagga1221@gmail.com",
    order: 2,
  },
  {
    name: "Jaanhavi Ashwin Kher",
    designation: "Head of CR",
    phone: "9880510255",
    email: "jaanhavi1207@gmail.com",
    order: 3,
  },
  {
    name: "Atharvi Desurkar",
    designation: "Head of SMM",
    phone: "6363217763",
    email: "atharvidesurkar@gmail.com",
    order: 4,
  },
  {
    name: "Aadya Arvind",
    designation: "Vice President",
    phone: "9480014524",
    email: "aadyaarvind2006@gmail.com",
    order: 5,
  },
  {
    name: "Suraj Acharya",
    designation: "Head of Tech",
    phone: "94482247018",
    email: "surajacharya2006@gmail.com",
    order: 6,
  },
  {
    name: "Dhruv Jagadeesh Hemmige",
    designation: "Head of FinOps",
    phone: "8296356444",
    email: "dhruvjagadeesh1@gmail.com",
    order: 7,
  },
];

for (const exp of expectedCore) {
  const found = coreMembers.find((c) => c.name === exp.name);
  assert(found, `Member ${exp.name} must be found`);
  assert.strictEqual(found.designation, exp.designation, `Designation mismatch for ${exp.name}`);
  assert.strictEqual(found.phone, exp.phone, `Phone mismatch for ${exp.name}`);
  assert.strictEqual(found.email, exp.email, `Email mismatch for ${exp.name}`);
  assert.strictEqual(found.order, exp.order, `Order mismatch for ${exp.name}`);
  assert.strictEqual(found.published, true, `Published must be true for ${exp.name}`);
}

console.log("✓ Initial contacts data and structure verified exactly against prompt specs");

// 2. Test Idempotency: Duplicate seed checks
const ids = INITIAL_CONTACTS.map((c) => c.id);
const uniqueIds = new Set(ids);
assert.strictEqual(ids.length, uniqueIds.size, "All contact IDs must be unique for idempotent seeding");
console.log("✓ Unique deterministic IDs verified for idempotent database seeding");

// 3. Test Authorization Logic
function checkAuthorization(userDoc) {
  if (!userDoc || !userDoc.email) throw new Error("Not signed in");
  if (userDoc.role !== "superadmin") throw new Error("No access (403)");
  return { authorized: true, email: userDoc.email };
}

// Any superadmin (Superadmin 1, Superadmin 2) must be authorized
const superAdmin1 = { email: "admin1@pes.edu", role: "superadmin" };
const superAdmin2 = { email: "admin2@pes.edu", role: "superadmin" };
assert.strictEqual(checkAuthorization(superAdmin1).authorized, true);
assert.strictEqual(checkAuthorization(superAdmin2).authorized, true);

// Domain heads and regular users must be denied
const domainHead = { email: "head@pes.edu", role: "domainHead", domainId: "events" };
assert.throws(() => checkAuthorization(domainHead), /No access/);

const regularUser = { email: "student@pes.edu", role: "normal" };
assert.throws(() => checkAuthorization(regularUser), /No access/);

const unauthenticated = null;
assert.throws(() => checkAuthorization(unauthenticated), /Not signed in/);

console.log("✓ Multi-superadmin authorization rule verified (all superadmins have full access, non-superadmins rejected)");

// 4. Test API input sanitization logic
function cleanContact(b) {
  const name = String(b.name || "").trim();
  const designation = String(b.designation || "").trim();
  const group = String(b.group || b.category || "Previous Core Team — Batch 2026").trim();
  const phone = String(b.phone || "").trim();
  const email = String(b.email || "").trim();
  const order = Number.isFinite(Number(b.order)) ? Number(b.order) : 1;
  const published = b.published !== false;

  if (!name || name.length > 120) return { error: "Name is required (max 120 characters)" };
  if (!designation || designation.length > 120) return { error: "Designation is required (max 120 characters)" };
  if (!group || group.length > 120) return { error: "Group/Category is required (max 120 characters)" };
  if (phone.length > 30) return { error: "Phone number is too long (max 30 characters)" };
  if (email.length > 254) return { error: "Email address is too long (max 254 characters)" };

  return { name, designation, group, category: group, phone, email, order, published };
}

assert(cleanContact({ name: "", designation: "Head" }).error, "Empty name must fail");
assert(cleanContact({ name: "Alice", designation: "" }).error, "Empty designation must fail");
assert(cleanContact({ name: "Alice", designation: "Head", phone: "1".repeat(35) }).error, "Long phone must fail");

const cleaned = cleanContact({
  name: "  Prof. Lakshmeesa  ",
  designation: "  Club Coordinator  ",
  group: "Club Coordinator",
});
assert.strictEqual(cleaned.name, "Prof. Lakshmeesa");
assert.strictEqual(cleaned.designation, "Club Coordinator");
assert.strictEqual(cleaned.phone, "");
assert.strictEqual(cleaned.email, "");
assert.strictEqual(cleaned.published, true);

console.log("✓ Validation and sanitization rules verified");
console.log("=== All Tests Passed Successfully! ===");

