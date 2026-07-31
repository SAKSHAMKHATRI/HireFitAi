import { AuthForm } from "@/components/auth/auth-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  return <AuthForm mode="login" nextPath={params.next ?? "/dashboard"} />
}
