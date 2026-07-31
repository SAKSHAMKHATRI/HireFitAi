export type MockUser = {
  name: string
  email: string
  avatar?: string
}

const AUTH_KEY = "hirefit_mock_auth"
const USER_KEY = "hirefit_mock_user"

export function setMockAuth(user: MockUser) {
  localStorage.setItem(AUTH_KEY, "true")
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearMockAuth() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getMockUser(): MockUser | null {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as MockUser
  } catch {
    return null
  }
}

export function hasMockAuth() {
  return localStorage.getItem(AUTH_KEY) === "true" && getMockUser() !== null
}
