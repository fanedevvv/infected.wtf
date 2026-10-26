import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import WidgetsManager from "./WidgetsManager";

export default async function IntegrationsPage({ searchParams, embedded = false }: { searchParams: Promise<{ error?: string; connected?: string }>; embedded?: boolean }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const integration = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "discord" } } });
  const socialLinks = await prisma.socialLink.findMany({ where: { userId: user.id }, orderBy: { displayOrder: "asc" } });

  return (
    <WidgetsManager
        initialSocialLinks={socialLinks.map((l) => ({ id: l.id, platform: l.platform, url: l.url }))}
        initialIntegration={
          integration
            ? {
                id: integration.id,
                discordUserId: integration.discordUserId,
                discordUsername: integration.discordUsername,
                discordGlobalName: integration.discordGlobalName,
                discordAvatar: integration.discordAvatar,
                visible: integration.visible ?? true,
                discordServerInvite: integration.discordServerInvite,
                discordServerId: integration.discordServerId,
                discordServerName: integration.discordServerName,
                discordServerIcon: integration.discordServerIcon,
                discordServerOnline: integration.discordServerOnline,
                discordServerTotal: integration.discordServerTotal,
                discordServerVisible: integration.discordServerVisible,
              }
            : null
        }
        error={params.error}
      connected={params.connected}
      embedded={embedded}
    />
  );
}
