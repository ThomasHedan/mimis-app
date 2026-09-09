#!/usr/bin/env node
// Génère le hash scrypt d'un mot de passe, à coller dans APP_USERS.
//
//   npm run hash-password -- 'mon mot de passe'
//   npm run hash-password            (saisie masquée, rien dans l'historique shell)
//
// Le module de hachage est importé depuis lib/auth/password.ts : le script et
// la route de connexion partagent exactement le même algorithme et les mêmes
// paramètres. Nécessite Node 22.18+ (lecture directe des fichiers TypeScript).

import { createInterface } from "node:readline/promises";
import { hashPassword } from "../lib/auth/password.ts";

async function promptHidden(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // On masque la frappe en interceptant l'écho du terminal.
  const onData = () => rl.output.write("\x1b[2K\r" + question);
  rl.input.on("data", onData);
  try {
    return await rl.question(question);
  } finally {
    rl.input.off("data", onData);
    rl.close();
    process.stdout.write("\n");
  }
}

const password = process.argv[2] ?? (await promptHidden("Mot de passe : "));

if (!password) {
  console.error("Mot de passe vide — abandon.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Mot de passe trop court (8 caractères minimum).");
  process.exit(1);
}

console.log(await hashPassword(password));
