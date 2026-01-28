'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Shield, AlertCircle, Lock, Eye, Database, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

export default function PrivacyPage() {
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

  const features = [
    {
      icon: <Shield className="size-6 text-blue-400" />,
      title: "Data Protection",
      description: "Your data is encrypted and securely stored"
    },
    {
      icon: <Lock className="size-6 text-green-400" />,
      title: "Secure Storage",
      description: "Industry-standard security measures"
    },
    {
      icon: <Eye className="size-6 text-purple-400" />,
      title: "Transparency",
      description: "Clear disclosure of data practices"
    },
    {
      icon: <UserCheck className="size-6 text-yellow-400" />,
      title: "Your Rights",
      description: "Full control over your personal data"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950 border-b border-gray-800 pt-32 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-950 to-gray-950"></div>
        
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
            <div className="p-3 bg-purple-600/10 rounded-xl border border-purple-600/20">
              <Shield className="size-8 text-purple-500" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Privacy Policy
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
            We take your privacy seriously. This policy describes how we collect, use, and protect your personal information.
          </motion.p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="grid md:grid-cols-2 gap-6 mb-16"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeIn}
              className="bg-gray-900/30 border border-gray-800 rounded-xl p-6 hover:border-purple-600/30 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-800/50 rounded-lg group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Placeholder Content */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerChildren}
          className="space-y-8"
        >
          <motion.div 
            variants={fadeIn}
            className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm"
          >
            <div className="bg-purple-600/10 border border-purple-600/20 rounded-xl p-6 flex gap-4">
              <AlertCircle className="size-6 text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <p className="text-white font-semibold text-lg mb-2">
                  Privacy Policy Content Required
                </p>
                <p className="text-gray-300">
                  This page has been created and is ready for your Privacy Policy content. 
                  Please provide the privacy policy text to complete this page with all necessary sections including:
                </p>
                <ul className="list-disc list-inside space-y-2 mt-4 text-gray-300">
                  <li className="hover:text-purple-400 transition-colors cursor-default">Information we collect</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">How we use your information</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">Data sharing and disclosure</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">Cookie policy</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">Your privacy rights</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">Data retention and security</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">Children's privacy</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">International data transfers</li>
                  <li className="hover:text-purple-400 transition-colors cursor-default">Changes to this policy</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.section
            variants={fadeIn}
            className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8 hover:border-purple-600/30 hover:shadow-lg hover:shadow-purple-600/5 transition-all duration-300"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Database className="size-6 text-purple-500" />
              <span>Contact Us About Privacy</span>
            </h2>
            <p className="text-gray-300 mb-4">
              If you have questions about our privacy practices or wish to exercise your privacy rights, please contact us:
            </p>
            <div className="bg-purple-600/10 border border-purple-600/20 rounded-xl p-6">
              <p className="text-gray-300 mb-3">
                📩 <a href="mailto:smart@smartclips.net" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">smart@smartclips.net</a>
              </p>
              <p className="text-white font-semibold">Smartclipsio LLC</p>
              <p className="text-gray-300">Florida, United States</p>
            </div>
          </motion.section>

          {/* Related Links */}
          <motion.div
            variants={fadeIn}
            className="bg-gray-900/30 border border-gray-800 rounded-2xl p-8"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Related Legal Documents</h3>
            <div className="space-y-3">
              <Link href="/terms-and-conditions">
                <div className="flex items-center gap-3 text-gray-300 hover:text-blue-400 transition-colors group">
                  <div className="p-2 bg-gray-800/50 rounded-lg group-hover:bg-blue-600/10 transition-colors">
                    <Shield className="size-4" />
                  </div>
                  <span>Terms of Service</span>
                  <ArrowLeft className="size-4 ml-auto rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
