import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

// Routes accessibles sans session active
const PUBLIC_PATHS = ["/login", "/offline", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La route cron s'authentifie avec son propre secret (Bearer CRON_SECRET),
  // pas avec un cookie de session.
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();

  // On vérifie la signature du cookie de session. Web Crypto est disponible en
  // Edge, donc aucun appel réseau ni accès base ici : la vérification est locale.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySessionToken(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Utilisateur non authentifié sur une route protégée
  if (!userId && !isPublic) {
    // Une API répond 401 — un redirect vers /login donnerait du HTML à un fetch().
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Utilisateur authentifié sur /login → redirection vers l'app
  if (userId && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Applique le proxy à toutes les routes SAUF les assets statiques.
    // Exclure sw.js et manifest.json pour ne pas bloquer l'installation PWA.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest\\.json|sw\\.js).*)",
  ],
};
