// Validation utilities placeholder
import { z } from 'zod'

export const commonValidation = {
  email: z.string().email(),
  password: z.string().min(8),
}