import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes accessibles sans session active
const PUBLIC_PATHS = ["/login", "/offline", "/auth/callback", "/auth/confirm", "/reset-password"];

export async function proxy(request: NextRequest) {
  // On part d'une réponse "passer au suivant" que l'on enrichira si besoin
  let supabaseResponse = NextResponse.next({ request });

  // Sécurité : on utilise createServerClient ici (pas createClient du browser)
  // pour que le middleware puisse lire ET écrire les cookies de session.
  // C'est nécessaire pour le refresh automatique des tokens JWT (expiration 1h).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Propagation des cookies mis à jour dans la requête ET la réponse.
          // Sans ça, le token rafraîchi serait perdu entre deux requêtes.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : getUser() (et non getSession()) valide le token côté serveur.
  // getSession() lit uniquement le cookie sans vérification — non sécurisé
  // pour une décision d'accès.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Utilisateur non authentifié tentant d'accéder à une route protégée
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Utilisateur authentifié sur /login → redirection vers l'app
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Applique le middleware à toutes les routes SAUF les assets statiques.
    // Exclure sw.js et manifest.json pour ne pas bloquer l'installation PWA.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest\\.json|sw\\.js).*)",
  ],
};
