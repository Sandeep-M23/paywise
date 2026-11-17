import { hashPassword } from "../lib/auth";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -w @paywise/api -- '<password>'");
  process.exit(1);
}
console.log(await hashPassword(password));
