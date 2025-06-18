export const issueGiftCard = async () => {
  const res = await fetch("/api/gift-cards/issue", { method: "POST" });
  return res.json();
};

export const redeemGiftCard = async (giftCardId: string, amount: number) => {
  const res = await fetch("/api/gift-cards/redeem-square", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ giftCardId, amount }),
  });
  return res.json();
};

export const reloadGiftCard = async (giftCardId: string, amount: number) => {
  const res = await fetch("/api/gift-cards/reload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ giftCardId, amount }),
  });
  return res.json();
};

export const checkBalance = async (giftCardId: string) => {
  const res = await fetch(`/api/gift-cards/balance/${giftCardId}`);
  return res.json();
};

export const getSquareStatus = async () => {
  const res = await fetch("/api/square/status");
  return res.json();
};

export const purchaseGiftCard = async (data: {
  amount: number;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  message?: string;
}) => {
  const res = await fetch("/api/gift-cards/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};