import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Points échappés : sinon `favicon.ico` matche aussi d’autres chaînes (`.` = tout caractère).
     * Inclut `.ico` pour tout fichier favicon / icône servi depuis la racine ou public/.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
