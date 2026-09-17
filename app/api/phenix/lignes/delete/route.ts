import { phenixProxyPost } from "@/lib/api/phenix-handlers";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";

export async function POST(request: Request) {
  return phenixProxyPost(request, PhenixEndpoints.msisdnDelete);
}
