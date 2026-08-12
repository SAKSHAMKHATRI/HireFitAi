import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata = {
  title: "Reset Password | HireFit AI",
  description: "Choose a new password for your HireFit AI account.",
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ oobCode?: string; mode?: string }>
}) {
  const params = await searchParams
  const oobCode = params.oobCode ?? null
  return <ResetPasswordForm oobCode={oobCode} />
}
