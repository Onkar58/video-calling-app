type SdpEntry = {
  username: string;
  sdp: string;
  createdAt: number;
  offerId: string;
};

const sdpOffers: Record<string, SdpEntry> = {};

export function storeSdpOffer(
  username: string,
  sdp: string,
  offerId: string
): string {
  sdpOffers[offerId] = { username, sdp, createdAt: Date.now(), offerId };
  return offerId;
}

export function getSdpOffer(offerId: string): SdpEntry | undefined {
  const offer = sdpOffers[offerId];
  return offer;
}
