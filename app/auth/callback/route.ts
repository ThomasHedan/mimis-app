import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Route qui intercepte le callback Supabase (reset password, invite, magic link).
// Supabase envoie un ?code= dans l'URL — on l'échange contre une session réelle.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (!code) {
    // Pas de code → redirect vers login (lien invalide ou expiré)
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  // Après un reset password, on envoie vers la page de nouveau mot de passe
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin));
  }

  // Sinon (invite acceptée, etc.) → accueil
  return NextResponse.redirect(new URL("/", origin));
}
