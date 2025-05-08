"use server"

import { debugAuthSession } from "@/utils/auth-debug"

export async function checkAuthStatus() {
  return await debugAuthSession()
}
