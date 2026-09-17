"use server";

/** Squelettes d’actions serveur — à remplacer par des appels `phenixFetch` réels. */

export async function stubNotImplemented(feature: string): Promise<never> {
  throw new Error(`TODO: implémenter ${feature}`);
}

export async function stubSaveCommandeSim() {
  return stubNotImplemented("SaveCommandeSim");
}

export async function stubSaveCommandeEsim() {
  return stubNotImplemented("SaveCommandeEsim");
}

export async function stubMsisdnActivate() {
  return stubNotImplemented("MsisdnActivate");
}

export async function stubMsisdnModifyOptions() {
  return stubNotImplemented("MsisdnModifyOptions");
}

export async function stubMsisdnDelete() {
  return stubNotImplemented("MsisdnDelete");
}

export async function stubSimSwap() {
  return stubNotImplemented("SimSwap");
}

export async function stubMsisdnConsultRio() {
  return stubNotImplemented("MsisdnConsultRio");
}

export async function stubSdtrConso() {
  return stubNotImplemented("SdtrConso");
}

export async function stubCdrConso() {
  return stubNotImplemented("CDR consommations");
}

export async function stubPortaLists() {
  return stubNotImplemented("Portabilités IN/OUT");
}

export async function stubCancelPortaIn() {
  return stubNotImplemented("CancelPortaIN");
}

export async function stubEsimQr() {
  return stubNotImplemented("eSIM QR / activation code");
}

export async function stubSwitchApn() {
  return stubNotImplemented("SwitchApn");
}

export async function stubSwitchOpe() {
  return stubNotImplemented("SwitchOPE");
}

export async function stubMsisdnDeleteCutOff() {
  return stubNotImplemented("MsisdnDeleteCutOff");
}

export async function stubCatalogue() {
  return stubNotImplemented("Catalogue produits/clients/profils");
}
