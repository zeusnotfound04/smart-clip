// Temporarily disable NextAuth handlers during build
// import { handlers } from "@/lib/auth";

// export const { GET, POST } = handlers;

export async function GET() {
  return new Response('NextAuth temporarily disabled during build', { status: 200 });
}

export async function POST() {
  return new Response('NextAuth temporarily disabled during build', { status: 200 });
}
