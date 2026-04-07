import { authOptions, validateAuthEnvironment } from "@/lib/auth-config"

// Validar ambiente ao importar
if (process.env.NODE_ENV === "production") {
  validateAuthEnvironment()
}

export { authOptions }
