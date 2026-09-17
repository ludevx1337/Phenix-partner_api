import { phenixProxyGet } from "@/lib/api/phenix-handlers";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";

export async function GET(request: Request) {
  return phenixProxyGet(request, PhenixEndpoints.getInfoSim);
}
