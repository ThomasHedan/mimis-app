import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getUsers, toPublicUser } from "@/lib/auth/users";
import { serverError, unauthorized } from "@/lib/http";

// Les "profils" ne viennent plus d'une table mais de la variable APP_USERS.
// Seuls id et display_name sortent — ni email ni hash de mot de passe.
export async function GET() {
  try {
    if (!(await getCurrentUser())) return unauthorized();

    const profiles = getUsers()
      .map(toPublicUser)
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "fr"));

    return NextResponse.json(profiles);
  } catch (error) {
    return serverError("profiles", error);
  }
}
