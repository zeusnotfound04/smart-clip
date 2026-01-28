'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Scale, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

export default function TermsAndConditionsPage() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const sections = [
    {
      num: 1,
      title: "Legal Notice / Purpose of These Policies",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips is an AI video editing platform. These legal terms exist to ensure that:</p>
          <ol className="list-decimal list-inside space-y-3 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">users do not upload illegal or stolen content,</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">SmartClips is not liable when users do, and</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">users grant permission for SmartClips to process videos using AI.</li>
          </ol>
        </>
      )
    },
    {
      num: 2,
      title: "The Service",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips provides AI-assisted tools for editing videos and generating content, including but not limited to:</p>
          <ul className="list-disc list-inside space-y-3 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">clipping and trimming</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">subtitles/captions</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">AI-assisted edits and enhancements</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">exporting and downloading edited media</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">storing projects and edited content</li>
          </ul>
          <p className="text-gray-300 mt-4">The Service may change over time, and we may update, modify, add, or remove features at any time.</p>
        </>
      )
    },
    {
      num: 3,
      title: "Eligibility",
      content: (
        <>
          <p className="text-gray-300 mb-4">To use SmartClips, you must be:</p>
          <ul className="list-disc list-inside space-y-3 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">at least 18 years old, or</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">using SmartClips with permission of a parent/guardian where legally allowed</li>
          </ul>
          <p className="text-gray-300 mt-4">By using SmartClips, you confirm you meet these requirements.</p>
        </>
      )
    },
    {
      num: 4,
      title: "Account Registration & Security",
      content: (
        <>
          <p className="text-gray-300 mb-4">You may need an account to access features. You agree that:</p>
          <ul className="list-disc list-inside space-y-3 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">the information you provide is accurate and up to date</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">you will keep your login credentials secure</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">you are responsible for all activity under your account</li>
          </ul>
          <p className="text-gray-300 mt-4">SmartClips is not responsible for unauthorized access caused by your failure to protect your account.</p>
        </>
      )
    },
    {
      num: 5,
      title: "Email + Marketing Communication Consent",
      content: (
        <>
          <p className="text-gray-300 mb-6">By creating an account, starting a free trial, purchasing a subscription, or using SmartClips, you agree that SmartClips may contact you at the email address you provided for:</p>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Service & Account Communications</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li className="hover:text-blue-400 transition-colors cursor-default">account verification and security alerts</li>
                <li className="hover:text-blue-400 transition-colors cursor-default">password resets and login notifications</li>
                <li className="hover:text-blue-400 transition-colors cursor-default">billing receipts, renewal notices, and payment issues</li>
                <li className="hover:text-blue-400 transition-colors cursor-default">customer support responses and service announcements</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Product Updates & Onboarding</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li className="hover:text-blue-400 transition-colors cursor-default">onboarding instructions and usage tips</li>
                <li className="hover:text-blue-400 transition-colors cursor-default">feature updates and platform improvements</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">Marketing & Promotions</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                <li className="hover:text-blue-400 transition-colors cursor-default">promotional messages, discounts, offers, and product announcements</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 bg-blue-600/10 border border-blue-600/20 rounded-xl p-4">
            <p className="text-gray-300">You may opt out of marketing and promotional messages at any time by clicking "unsubscribe" in the email or by contacting <a href="mailto:smart@smartclips.net" className="text-blue-400 hover:text-blue-300 transition-colors">smart@smartclips.net</a>.</p>
            <p className="text-gray-300 mt-2">Even if you opt out of marketing, we may still send non-promotional service emails (such as billing confirmations or security notices).</p>
          </div>
        </>
      )
    },
    {
      num: 6,
      title: "Subscription Plans, Billing, and Payment",
      content: (
        <>
          <p className="text-gray-300 mb-4">Some features require payment and may be offered through monthly or annual subscription plans ("Subscription"). By purchasing a Subscription, you authorize SmartClips to charge your selected payment method on a recurring basis unless you cancel.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Billing Terms</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">Subscription fees are billed in advance</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">Subscriptions automatically renew unless canceled</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">You are responsible for applicable taxes, fees, or charges</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">If payment fails, we may suspend or limit access until payment is resolved</li>
          </ul>
          <p className="text-gray-300 mt-4">We may change pricing at any time, but pricing changes apply only to future billing periods after notice is provided.</p>
        </>
      )
    },
    {
      num: 7,
      title: "Free Trials (If Offered)",
      content: (
        <>
          <p className="text-gray-300 mb-4">If SmartClips provides a free trial:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">you may be required to enter a payment method</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">you will be charged automatically when the trial ends unless you cancel before the end of the trial</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">trials may be limited to one per user/account</li>
          </ul>
        </>
      )
    },
    {
      num: 8,
      title: "Refund Policy (No Refunds / Anti-Chargeback Protection)",
      content: (
        <>
          <p className="text-gray-300 mb-4">Unless required by law, all purchases are final and non-refundable, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">unused time remaining in a billing period</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">accidental purchases</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">failure to cancel before renewal</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">dissatisfaction with AI outputs or results</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">partial month usage</li>
          </ul>
          <div className="mt-4 bg-yellow-600/10 border border-yellow-600/20 rounded-xl p-4">
            <p className="text-gray-300">If you believe there was a billing error, you must contact us at <a href="mailto:smart@smartclips.net" className="text-blue-400 hover:text-blue-300 transition-colors">smart@smartclips.net</a> within 7 days of the charge. Chargebacks and payment disputes may result in immediate account suspension or termination.</p>
          </div>
        </>
      )
    },
    {
      num: 9,
      title: "User Content & Ownership",
      content: (
        <>
          <p className="text-gray-300 mb-4">"User Content" means any content you upload, submit, create, or edit using SmartClips, including video, audio, images, and text.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">You Own Your Content</h3>
          <p className="text-gray-300 mb-4">You retain ownership of your User Content.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">License You Grant SmartClips</h3>
          <p className="text-gray-300 mb-4">By uploading or using content on SmartClips, you grant SmartClips a non-exclusive, worldwide, royalty-free license to:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">host, store, reproduce, process, edit, transform, and display your User Content</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">generate AI outputs requested by you</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">provide the Service and related features</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">improve platform functionality, reliability, and performance</li>
          </ul>
          <p className="text-gray-300 mt-4">This license is limited to operating and improving SmartClips and ends when you delete your content, except where retention is required for legal, safety, or technical reasons.</p>
        </>
      )
    },
    {
      num: 10,
      title: "AI-Generated Output Disclaimer",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips uses AI systems to generate or assist with edits ("AI Output"). You understand:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">AI Output may be inaccurate, incomplete, low quality, or undesirable</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">AI may mishear words, mistranscribe captions, or incorrectly identify objects/speakers</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">you are responsible for reviewing and approving content before publishing</li>
          </ul>
          <p className="text-gray-300 mt-4">SmartClips does not guarantee performance, results, virality, growth, reach, or accuracy.</p>
        </>
      )
    },
    {
      num: 11,
      title: "COPYRIGHT + INTELLECTUAL PROPERTY",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips respects intellectual property rights and expects all users to do the same.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">A. Your Content Must Be Yours</h3>
          <p className="text-gray-300 mb-4">By uploading content to SmartClips, you represent and warrant that:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">you own the content or you have the necessary rights/licenses to use it; and</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">your content does not infringe any third-party rights, including copyrights, trademarks, privacy rights, or publicity rights.</li>
          </ol>
          <p className="text-gray-300 mt-4">You are solely responsible for your uploaded content and any consequences related to its use.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">B. SmartClips Platform Ownership</h3>
          <p className="text-gray-300 mb-4">SmartClips and Smartclipsio LLC own all rights to the Service, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">software, code, UI/UX, design</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">systems, workflows, templates, and tools</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">branding, trademarks, logos</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">proprietary algorithms and AI-assisted technology</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">updates, improvements, and derivatives</li>
          </ul>
          <p className="text-gray-300 mt-4">No ownership is transferred to you by using the Service. You may not copy, resell, scrape, reverse engineer, or create derivative works of SmartClips without written permission.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">C. Copyright Infringement & Content Removal</h3>
          <p className="text-gray-300 mb-4">We may remove or restrict access to content we believe violates these Terms or any law, with or without notice. Repeat infringers may have their accounts terminated.</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">D. DMCA Notice & Takedown Requests</h3>
          <p className="text-gray-300">If you believe content on SmartClips infringes your copyrighted work, email: <a href="mailto:smart@smartclips.net" className="text-blue-400 hover:text-blue-300 transition-colors">📩 smart@smartclips.net</a></p>
        </>
      )
    },
    {
      num: 12,
      title: "Acceptable Use Policy (What You Cannot Do)",
      content: (
        <>
          <p className="text-gray-300 mb-4">You agree not to use SmartClips for:</p>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Illegal or Harmful Activity</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">illegal content or criminal activity</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">harassment, threats, hate speech, or violence</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">abuse, exploitation, or sexual content involving minors (zero tolerance)</li>
          </ul>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Copyright / Stolen Content</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">uploading content you do not own or have permission to use</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">infringing third-party copyrights or trademarks</li>
          </ul>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Fraud / Scams / Deceptive Media</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">impersonation for fraud</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">generating misleading content used for scams</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">creating deepfake impersonations intended to harm, mislead, or deceive</li>
          </ul>
          <h3 className="text-xl font-semibold text-white mt-6 mb-3">Platform Abuse</h3>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">hacking, scraping, reverse engineering</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">bypassing paywalls or limits</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">overloading systems or disrupting service</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">using automated tools to abuse exports, clips, or processing</li>
          </ul>
          <p className="text-gray-300 mt-4">Violation of these rules may result in suspension or termination.</p>
        </>
      )
    },
    {
      num: 13,
      title: "Data Storage and Content Deletion",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips may store your uploaded content and projects to provide the Service.</p>
          <p className="text-gray-300 mb-4">You may delete content from your account where features allow. However:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">backup copies may persist temporarily</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">some data may be retained for legal, accounting, or security reasons</li>
          </ul>
        </>
      )
    },
    {
      num: 14,
      title: "Third-Party Services",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips may integrate with third-party tools (such as payment providers, hosting, analytics, or platform APIs).</p>
          <p className="text-gray-300">We are not responsible for third-party services, outages, policy changes, or actions taken by outside platforms.</p>
        </>
      )
    },
    {
      num: 15,
      title: "Service Changes & Availability",
      content: (
        <>
          <p className="text-gray-300 mb-4">We may update, change, suspend, or discontinue any part of SmartClips at any time.</p>
          <p className="text-gray-300">We do not guarantee the Service will always be available or uninterrupted.</p>
        </>
      )
    },
    {
      num: 16,
      title: "Disclaimer of Warranties",
      content: (
        <>
          <p className="text-gray-300 mb-4">SmartClips is provided "AS IS" and "AS AVAILABLE."</p>
          <p className="text-gray-300 mb-4">We disclaim all warranties, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">merchantability</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">fitness for a particular purpose</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">non-infringement</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">accuracy or reliability of AI Output</li>
          </ul>
        </>
      )
    },
    {
      num: 17,
      title: "Limitation of Liability",
      content: (
        <>
          <p className="text-gray-300 mb-4">To the maximum extent permitted by law, SmartClips will not be liable for:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">lost profits, lost revenue, or lost business</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">lost data or inability to access content</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">content removal or account termination</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">damages resulting from AI Output accuracy issues</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">indirect, special, incidental, or consequential damages</li>
          </ul>
          <p className="text-gray-300 mt-4">Total liability is limited to the amount paid by you in the last 30 days, if any.</p>
        </>
      )
    },
    {
      num: 18,
      title: "Indemnification (Users Protect SmartClips)",
      content: (
        <>
          <p className="text-gray-300 mb-4">You agree to defend, indemnify, and hold harmless SmartClips and its owners, employees, contractors, and affiliates from any claims, damages, losses, or legal fees arising from:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">your User Content</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">your violation of these Terms</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">your infringement of copyright/trademark</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">your misuse of the Service</li>
          </ul>
        </>
      )
    },
    {
      num: 19,
      title: "Suspension & Termination",
      content: (
        <>
          <p className="text-gray-300 mb-4">We may suspend or terminate your account at any time if you:</p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
            <li className="hover:text-blue-400 transition-colors cursor-default">violate these Terms</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">engage in illegal behavior</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">upload infringing or stolen content</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">abuse the platform or payment system</li>
            <li className="hover:text-blue-400 transition-colors cursor-default">attempt fraud or chargeback abuse</li>
          </ul>
          <p className="text-gray-300 mt-4">You may cancel anytime through your account settings.</p>
        </>
      )
    },
    {
      num: 20,
      title: "Governing Law & Venue",
      content: (
        <>
          <p className="text-gray-300 mb-4">These Terms are governed by the laws of the State of Florida, without regard to conflict of law rules.</p>
          <p className="text-gray-300">Any disputes must be brought in Florida courts, unless otherwise required by law.</p>
        </>
      )
    },
    {
      num: 21,
      title: "Changes to These Terms",
      content: (
        <>
          <p className="text-gray-300 mb-4">We may update these Terms at any time. Updates become effective once posted.</p>
          <p className="text-gray-300">Continued use of SmartClips after updates means you accept the revised Terms.</p>
        </>
      )
    },
    {
      num: 22,
      title: "Contact Information",
      content: (
        <>
          <p className="text-gray-300 mb-4">For support, legal requests, billing issues, or DMCA inquiries, contact:</p>
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-6">
            <p className="text-gray-300 mb-3">
              📩 <a href="mailto:smart@smartclips.net" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">smart@smartclips.net</a>
            </p>
            <p className="text-white font-semibold">Smartclipsio LLC</p>
            <p className="text-gray-300">Florida, United States</p>
          </div>
        </>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 border-b border-gray-800 pt-32 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950"></div>
        
        <div className="container mx-auto px-6 max-w-4xl relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/">
              <Button variant="ghost" className="text-gray-400 hover:text-white mb-8 -ml-2 group">
                <ArrowLeft className="size-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
              <Scale className="size-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Terms of Service
              </h1>
              <p className="text-gray-400 mt-2">Last updated: January 23, 2026</p>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg text-gray-300 max-w-2xl"
          >
            Please read these terms carefully before using SmartClips. By accessing or using our service, you agree to be bound by these terms.
          </motion.p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="space-y-8"
        >
          {/* Introduction */}
          <motion.div 
            variants={fadeIn}
            className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm"
          >
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              These Terms of Service ("Terms") govern your access to and use of SmartClips, an AI-powered video editing platform operated by Smartclipsio LLC ("SmartClips," "Company," "we," "us," or "our").
            </p>

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-6 flex gap-4">
              <AlertCircle className="size-6 text-blue-400 flex-shrink-0 mt-1" />
              <p className="text-white font-semibold text-lg">
                By accessing or using SmartClips, you agree to these Terms. If you do not agree, do not use the Service.
              </p>
            </div>
          </motion.div>

          {/* All Sections */}
          {sections.map((section) => (
            <motion.section
              key={section.num}
              variants={fadeIn}
              className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/30 hover:shadow-lg hover:shadow-blue-600/5 transition-all duration-300 group"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="text-blue-500 group-hover:scale-110 transition-transform">{section.num})</span>
                <span>{section.title}</span>
              </h2>
              {section.content}
            </motion.section>
          ))}
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
