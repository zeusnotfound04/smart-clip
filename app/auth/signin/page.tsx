"use client";

import { SignInForm } from "@/components/auth/signin-form";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="flex flex-col items-center gap-4 w-full">
        <SignInForm />
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Don't have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
