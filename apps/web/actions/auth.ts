"use server";

import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { redirect } from "next/navigation";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function signUpAction(data: z.infer<typeof signUpSchema>) {
  try {
    const validated = signUpSchema.parse(data);

    await apiClient.signUp(validated.name, validated.email, validated.password);
    
    // Redirect to dashboard after successful signup
    redirect('/dashboard');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: error.message || "Something went wrong" };
  }
}

export async function signInAction(data: z.infer<typeof signInSchema>) {
  try {
    const validated = signInSchema.parse(data);

    await apiClient.signIn(validated.email, validated.password);
    
    // Redirect to dashboard after successful signin
    redirect('/dashboard');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: error.response?.data?.message || error.message || "Invalid credentials" };
  }
}
