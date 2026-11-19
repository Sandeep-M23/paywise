import type { ApiResult, LoginInput, LoginResponse } from "@/@types";
import { postData } from "@/utils/services";

/** Never throws: the sign-in form shows `message` either way. */
export async function handleLogin(payload: LoginInput): Promise<ApiResult<LoginResponse>> {
  try {
    const body = await postData<{ message: string; data: LoginResponse }>("/auth/login", payload);
    return { ok: true, message: body.message, data: body.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not sign in. Try again.";
    return { ok: false, message };
  }
}
