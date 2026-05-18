/**
 * DNS override bootstrap — forces Node to use Google Public DNS (8.8.8.8)
 * instead of the system resolver. This fixes environments where the ISP
 * blocks MongoDB Atlas SRV / A record lookups.
 *
 * Loaded BEFORE anything else via:  node -r ./dns-fix.js src/server.js
 */
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

console.log("[dns-fix] DNS resolver overridden → 8.8.8.8, 8.8.4.4");
