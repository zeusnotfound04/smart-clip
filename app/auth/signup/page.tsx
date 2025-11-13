"use client";

import { SignUpForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="flex flex-col items-center gap-4 w-full">
        <SignUpForm />
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
