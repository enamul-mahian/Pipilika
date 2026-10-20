import { getUser } from "@/lib/auth";
import { ProfileForm } from "@/components/account-tools";
export default async function Profile() {
  const u = (await getUser())!;
  return <div><h1 className="mb-4 text-3xl">Profile</h1><ProfileForm user={{ name: u.name, email: u.email, phone: u.phone, birthday: u.birthday, marketingOptIn: u.marketingOptIn }} /></div>;
}
