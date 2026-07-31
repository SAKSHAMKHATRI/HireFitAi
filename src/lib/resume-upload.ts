export const maxResumeFileSize = 8 * 1024 * 1024

export function formatResumeFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export function fileToDataUri(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read the uploaded PDF. Please try again."))
      }
    }
    reader.onerror = () => reject(new Error("Could not read the uploaded PDF. Please try again."))
    reader.readAsDataURL(file)
  })
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

export function friendlyErrorMessage(error: unknown, fallback = "Resume analysis failed. Please try again.") {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
