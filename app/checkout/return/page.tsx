import { redirect } from "next/navigation";

export default function CheckoutReturnPage({ searchParams }: { searchParams?: { session_id?: string } }) {
  const params = new URLSearchParams();
  if (searchParams?.session_id) params.set("session_id", searchParams.session_id);
  redirect(`/checkout/success${params.size ? `?${params}` : ""}`);
}
