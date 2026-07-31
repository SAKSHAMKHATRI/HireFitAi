import { AuthForm } from "@/components/auth/auth-form"

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  return <AuthForm mode="signup" nextPath={params.next ?? "/dashboard"} />
}
