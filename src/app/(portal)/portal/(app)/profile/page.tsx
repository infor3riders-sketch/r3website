import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/portal/avatar";
import { AvatarForm, ProfileForm } from "@/components/portal/profile-forms";
import { ViewOnly, ViewOnlyNotice } from "@/components/portal/view-only";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getOwnProfile, signedAvatarUrls } from "@/server/queries/members";
import { memberCan } from "@/server/queries/permissions";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const { userId } = await requireUser("/profile");
  const profile = await getOwnProfile(userId);
  if (!profile) notFound();
  const [avatars, canEdit, canBikes] = await Promise.all([signedAvatarUrls([profile.avatar_path]), memberCan(profile.role, "edit_profile"), memberCan(profile.role, "manage_motorcycles")]);

  return (
    <div className="max-w-3xl space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={profile.full_name ?? profile.email ?? "Member"} src={profile.avatar_path ? avatars[profile.avatar_path] : null} className="h-20 w-20" />
        <div>
          <h1 className="text-3xl font-semibold uppercase">My Profile</h1>
          <p className="text-sm text-muted">
            {profile.email} · <span className="capitalize">{profile.role}</span>
            {profile.member_since ? ` · member since ${formatDate(profile.member_since)}` : ""}
          </p>
          <Link href="/profile/motorcycles" className="text-sm text-gold hover:text-gold-hover">
            {canBikes ? "Manage my motorcycles" : "View my motorcycles"} &rarr;
          </Link>
        </div>
      </header>

      {canEdit ? (
        <section className="rounded-lg border border-line bg-panel p-5">
          <AvatarForm />
        </section>
      ) : (
        <ViewOnlyNotice />
      )}

      <section className="rounded-lg border border-line bg-panel p-5">
        <ViewOnly locked={!canEdit}>
          <ProfileForm profile={profile} />
        </ViewOnly>
      </section>
    </div>
  );
}
