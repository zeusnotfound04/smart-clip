/**
 * Script to make a user an admin
 * Run this script to set admin status for a user by email
 * 
 * Usage:
 * node make-admin.js user@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email) {
  try {
    if (!email) {
      console.error('Error: Email is required');
      console.log('Usage: node make-admin.js user@example.com');
      process.exit(1);
    }

    console.log(`Looking for user: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true
      }
    });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`ℹUser ${email} is already an admin`);
      process.exit(0);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true
      }
    });

    console.log(`Successfully made ${email} an admin!`);
    console.log('User details:', {
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin
    });

  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
makeAdmin(email);
