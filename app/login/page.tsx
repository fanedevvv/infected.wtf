import LoginForm from "./LoginForm";
import CookieBanner from "@/components/CookieBanner";
import { getCookieConsent } from "@/lib/cookie-consent";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const params = await searchParams;
  const consent = await getCookieConsent();
  return (
    <>
      <LoginForm verified={params.verified === "1"} />
      <CookieBanner initialConsent={consent} />
    </>
  );
}
