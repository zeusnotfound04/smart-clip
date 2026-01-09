"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Crown, Sparkles, Star } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    description: "Try SmartClip for free",
    features: [
      "10 credits per month",
      "10 minutes of footage",
      "With watermark",
      "Basic features",
      "Community support"
    ],
    icon: Sparkles,
    popular: false,
  },
  {
    name: "Basic",
    price: "$30",
    period: "/month",
    description: "Perfect for getting started",
    features: [
      "300 credits per month",
      "300 minutes of footage",
      "No watermark",
      "All features included",
      "Email support"
    ],
    icon: Zap,
    popular: false,
  },
  {
    name: "Executive Premium",
    price: "$40",
    period: "/month",
    description: "For serious content creators",
    features: [
      "500 credits per month",
      "500 minutes of footage",
      "No watermark",
      "All features included",
      "Priority support",
      "Advanced analytics"
    ],
    icon: Crown,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Custom solution for teams",
    features: [
      "Custom credit allocation",
      "No watermark",
      "All features included",
      "24/7 priority support",
      "Advanced analytics",
      "API access",
      "Dedicated account manager"
    ],
    icon: Crown,
    popular: false,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Star className="w-4 h-4" />
            Pricing Plans
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Perfect Plan
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Flexible pricing for creators of all sizes. Start free, upgrade as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            
            return (
              <div
                key={plan.name}
                className={`
                  relative rounded-2xl p-6 border-2 transition-all duration-200
                  ${plan.popular 
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-transparent shadow-xl hover:shadow-2xl' 
                    : 'bg-card border-border hover:border-primary/50 hover:shadow-lg'
                  }
                `}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  plan.popular ? 'bg-white/20' : 'bg-primary/10'
                }`}>
                  <Icon className={`w-6 h-6 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                </div>

                {/* Plan name */}
                <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : ''}`}>
                  {plan.name}
                </h3>

                {/* Description */}
                <p className={`text-sm mb-6 ${plan.popular ? 'text-blue-100' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : ''}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-base ${plan.popular ? 'text-blue-200' : 'text-muted-foreground'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className={`h-px w-full mb-6 ${plan.popular ? 'bg-white/20' : 'bg-border'}`} />

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className={`
                        flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                        ${plan.popular ? 'bg-white/20' : 'bg-primary/10'}
                      `}>
                        <Check className={`w-3 h-3 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                      </div>
                      <span className={plan.popular ? 'text-white' : ''}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-white text-blue-600 hover:bg-blue-50' 
                      : ''
                  }`}
                  variant={plan.popular ? 'secondary' : 'default'}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : plan.name === 'Free' ? 'Get Started Free' : 'Get Started'}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Bottom text */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            All plans include a 14-day money-back guarantee · Each credit = 1 minute of video processing
          </p>
        </div>
      </div>
    </section>
  )
}
