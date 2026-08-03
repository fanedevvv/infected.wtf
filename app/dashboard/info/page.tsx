import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import ProfileInfoForm from "./ProfileInfoForm";

export default async function ProfileInfoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/dashboard");

  return (
    <ProfileInfoForm
      avatar={profile.avatar}
      backgroundType={profile.backgroundType || "particles"}
      backgroundValue={profile.backgroundValue || "#050507"}
      musicPath={profile.musicPath}
      cursorPath={profile.cursorPath}
      displayName={profile.displayName || ""}
      location={profile.location || ""}
      bio={profile.bio || ""}
      profileFont={profile.profileFont || "Syne"}
      profileOpacity={profile.profileOpacity ?? 100}
      profileBlur={profile.profileBlur ?? 0}
    />
  );
}
