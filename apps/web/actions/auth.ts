"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { signIn } from "@/lib/auth";
// AuthError is not available in next-auth v4, we'll use a generic error approach

const prisma = new PrismaClient();

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

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return { success: false, error: "Email already exists" };
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Something went wrong" };
  }
}

export async function signInAction(data: z.infer<typeof signInSchema>) {
  try {
    const validated = signInSchema.parse(data);

    await signIn("credentials", {
      email: validated.email,
      password: validated.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    // Handle auth errors (next-auth v4 doesn't export AuthError)
    if (error && typeof error === 'object' && 'type' in error) {
      return { success: false, error: "Invalid credentials" };
    }
    return { success: false, error: "Something went wrong" };
  }
}
