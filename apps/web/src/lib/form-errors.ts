import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";

/** Puts API field errors on the matching inputs; anything else becomes a toast. */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, Path<T>> = {},
) {
  if (error instanceof ApiError) {
    if (error.code === "duplicate_email")
      return setError("email" as Path<T>, { message: error.message });
    if (error.code === "duplicate_employee_code") {
      return setError("employeeCode" as Path<T>, { message: error.message });
    }
    if (error.details.length > 0) {
      for (const detail of error.details) {
        setError((fieldMap[detail.path] ?? detail.path) as Path<T>, { message: detail.message });
      }
      return;
    }
    return toast.error(error.message);
  }
  toast.error("Something went wrong. Please try again.");
}
