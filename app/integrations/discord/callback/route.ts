// Discord redirects here after authorisation: this is the redirect URI registered on the Discord application.
// The handler itself lives with the other integration routes.
export { GET } from "@/app/api/integrations/discord/callback/route";
