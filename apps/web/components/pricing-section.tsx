"use client"

import { motion, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Rocket, Sparkles, Star } from "lucide-react"
import { useRef } from "react"

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/forever",
    description: "Perfect for trying out SmartClip",
    features: [
      "5 videos per month",
      "Basic AI editing",
      "720p export quality",
      "Community support",
      "Standard templates"
    ],
    icon: Sparkles,
    color: "from-gray-600 to-gray-800",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For serious content creators",
    features: [
      "Unlimited videos",
      "Advanced AI tools",
      "4K export quality",
      "Priority support",
      "Custom branding",
      "Analytics dashboard",
      "API access"
    ],
    icon: Zap,
    color: "from-blue-600 via-purple-600 to-pink-600",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For teams and businesses",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "White-label solution",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Training & onboarding"
    ],
    icon: Crown,
    color: "from-yellow-600 to-orange-600",
    popular: false,
  },
]

export default function PricingSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: false, amount: 0.2 })

  return (
    <section id="pricing" ref={sectionRef} className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-black via-gray-950 to-gray-900">
      {/* Crazy animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Rotating gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            rotate: [0, 360],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            rotate: [360, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl"
        />

        {/* Floating stars */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -80, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </motion.div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            animate={isInView ? { 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1]
            } : {}}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-6"
          >
            <Rocket className="w-16 h-16 text-purple-400" />
          </motion.div>

          <motion.h2 
            className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-6"
            animate={{ 
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] 
            }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ backgroundSize: "200% auto" }}
          >
            Simple Pricing
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-300"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Start free, scale as you grow. No hidden fees!
          </motion.p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: index * 0.15, duration: 0.8 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: plan.popular ? 1.08 : 1.05,
                  y: -15,
                  rotateY: plan.popular ? 5 : 0
                }}
                className={`
                  relative group perspective-1000
                  ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}
                `}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-5 left-1/2 -translate-x-1/2 z-20"
                  >
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 px-6 py-2 rounded-full text-sm font-bold shadow-2xl flex items-center gap-2">
                      <Star className="w-4 h-4 fill-current" />
                      MOST POPULAR
                    </div>
                  </motion.div>
                )}

                {/* Card */}
                <div className={`
                  relative p-8 rounded-3xl border-2 h-full backdrop-blur-xl transition-all duration-500
                  ${plan.popular 
                    ? 'bg-gradient-to-br ' + plan.color + ' border-transparent shadow-2xl shadow-purple-500/50' 
                    : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                  }
                `}>
                  {/* Animated glow */}
                  {plan.popular && (
                    <motion.div
                      className="absolute inset-0 rounded-3xl opacity-50"
                      animate={{
                        boxShadow: [
                          '0 0 30px rgba(168, 85, 247, 0.4)',
                          '0 0 60px rgba(236, 72, 153, 0.6)',
                          '0 0 30px rgba(168, 85, 247, 0.4)',
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                      plan.popular ? 'bg-white/20' : 'bg-gray-800'
                    }`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className={`w-8 h-8 ${plan.popular ? 'text-white' : 'text-purple-400'}`} />
                  </motion.div>

                  {/* Plan name */}
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-200'}`}>
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-4">
                    <span className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-gray-100'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-lg ml-1 ${plan.popular ? 'text-white/70' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  </div>

                  {/* Description */}
                  <p className={`text-sm mb-8 ${plan.popular ? 'text-white/80' : 'text-gray-400'}`}>
                    {plan.description}
                  </p>

                  {/* CTA Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      w-full py-4 rounded-full font-semibold text-lg mb-8 transition-all duration-300
                      ${plan.popular 
                        ? 'bg-white text-purple-600 hover:bg-gray-100 shadow-xl' 
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
                      }
                    `}
                  >
                    {plan.popular ? 'Start Free Trial' : 'Get Started'}
                  </motion.button>

                  {/* Features */}
                  <div className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.15 + i * 0.05 }}
                        viewport={{ once: true }}
                        className="flex items-start gap-3"
                      >
                        <div className={`
                          flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                          ${plan.popular ? 'bg-white/20' : 'bg-gray-800'}
                        `}>
                          <Check className={`w-3 h-3 ${plan.popular ? 'text-white' : 'text-purple-400'}`} />
                        </div>
                        <span className={`text-sm ${plan.popular ? 'text-white/90' : 'text-gray-300'}`}>
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at center, ${plan.popular ? 'rgba(168, 85, 247, 0.4)' : 'rgba(107, 114, 128, 0.3)'}, transparent 70%)`,
                    filter: 'blur(20px)',
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Bottom text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-gray-400 text-lg">
            🎉 All plans include 14-day money-back guarantee · No credit card required for free plan
          </p>
        </motion.div>
      </div>
    </section>
  )
}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`text-sm ${plan.highlighted ? "text-background/80" : "text-muted-foreground"}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
