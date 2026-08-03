import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import IntegrationsContent from "./IntegrationsContent";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const integration = await prisma.integration.findUnique({ where: { userId_type: { userId: user.id, type: "discord" } } });

  return (
    <IntegrationsContent
      initialIntegration={
        integration
          ? {
              id: integration.id,
              discordUserId: integration.discordUserId,
              discordUsername: integration.discordUsername,
              discordGlobalName: integration.discordGlobalName,
              discordAvatar: integration.discordAvatar,
              visible: integration.visible,
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
    />
  );
}
