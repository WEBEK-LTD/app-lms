import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { ProfileForm } from "@/components/community/site/profile-form";
import { myProfile } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Edit profile", robots: { index: false } };

/** 231 The member's own profile, to edit. */
export default async function EditProfilePage() {
  const { w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.editProfile()));
  const mine = (await myProfile()) ?? { name: viewer.name, handle: viewer.handle, bio: "", skills: [], links: [], avatarUrl: viewer.avatarUrl };
  return (
    <SitePage active="none">
      <div style={{ maxWidth: 720 }}>
        <ProfileForm w={w} initial={mine} />
      </div>
    </SitePage>
  );
}
