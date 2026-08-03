import RegisterForm from "./RegisterForm";
import CookieBanner from "@/components/CookieBanner";
import { getCookieConsent } from "@/lib/cookie-consent";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; u?: string }>;
}) {
  const params = await searchParams;
  const consent = await getCookieConsent();
  return (
    <>
      <RegisterForm initialRef={params.ref || ""} initialUsername={params.u || ""} />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
