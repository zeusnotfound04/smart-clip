'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface TermsOfServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function TermsOfServiceModal({ 
  open, 
  onOpenChange, 
  onAccept,
  showAcceptButton = false 
}: TermsOfServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold">SmartClips Terms of Service</DialogTitle>
          <DialogDescription>
            Effective Date: January 23, 2026 | Last Updated: January 23, 2026
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] px-6 pb-6">
          <div className="space-y-6 text-sm">
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your access to and use of SmartClips, an AI-powered video editing platform operated by Smartclipsio LLC ("SmartClips," "Company," "we," "us," or "our").
            </p>
            <p className="text-muted-foreground">
              By accessing or using SmartClips, you agree to these Terms. If you do not agree, do not use the Service.
            </p>

            <section>
              <h3 className="font-bold text-base mb-2">1. Legal Notice / Purpose of These Policies</h3>
              <p className="text-muted-foreground mb-2">
                SmartClips is an AI video editing platform. These legal terms exist to ensure that:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>users do not upload illegal or stolen content,</li>
                <li>SmartClips is not liable when users do, and</li>
                <li>users grant permission for SmartClips to process videos using AI.</li>
              </ol>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">2. The Service</h3>
              <p className="text-muted-foreground mb-2">
                SmartClips provides AI-assisted tools for editing videos and generating content, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>clipping and trimming</li>
                <li>subtitles/captions</li>
                <li>AI-assisted edits and enhancements</li>
                <li>exporting and downloading edited media</li>
                <li>storing projects and edited content</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                The Service may change over time, and we may update, modify, add, or remove features at any time.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">3. Eligibility</h3>
              <p className="text-muted-foreground mb-2">To use SmartClips, you must be:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>at least 18 years old, or</li>
                <li>using SmartClips with permission of a parent/guardian where legally allowed</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                By using SmartClips, you confirm you meet these requirements.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">4. Account Registration & Security</h3>
              <p className="text-muted-foreground mb-2">
                You may need an account to access features. You agree that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>the information you provide is accurate and up to date</li>
                <li>you will keep your login credentials secure</li>
                <li>you are responsible for all activity under your account</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                SmartClips is not responsible for unauthorized access caused by your failure to protect your account.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">5. Email + Marketing Communication Consent</h3>
              <p className="text-muted-foreground mb-2">
                By creating an account, starting a free trial, purchasing a subscription, or using SmartClips, you agree that SmartClips may contact you at the email address you provided for:
              </p>
              <div className="space-y-3 ml-4">
                <div>
                  <h4 className="font-semibold text-sm">Service & Account Communications</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>account verification and security alerts</li>
                    <li>password resets and login notifications</li>
                    <li>billing receipts, renewal notices, and payment issues</li>
                    <li>customer support responses and service announcements</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Product Updates & Onboarding</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>onboarding instructions and usage tips</li>
                    <li>feature updates and platform improvements</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Marketing & Promotions</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>promotional messages, discounts, offers, and product announcements</li>
                  </ul>
                </div>
              </div>
              <p className="text-muted-foreground mt-2">
                You may opt out of marketing and promotional messages at any time by clicking "unsubscribe" in the email or by contacting smart@smartclips.net.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">6. Subscription Plans, Billing, and Payment</h3>
              <p className="text-muted-foreground mb-2">
                Some features require payment and may be offered through monthly or annual subscription plans ("Subscription").
              </p>
              <p className="text-muted-foreground mb-2">
                By purchasing a Subscription, you authorize SmartClips to charge your selected payment method on a recurring basis unless you cancel.
              </p>
              <h4 className="font-semibold text-sm mb-1">Billing Terms</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Subscription fees are billed in advance</li>
                <li>Subscriptions automatically renew unless canceled</li>
                <li>You are responsible for applicable taxes, fees, or charges</li>
                <li>If payment fails, we may suspend or limit access until payment is resolved</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">7. Free Trials</h3>
              <p className="text-muted-foreground mb-2">If SmartClips provides a free trial:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>you may be required to enter a payment method</li>
                <li>you will be charged automatically when the trial ends unless you cancel before the end of the trial</li>
                <li>trials may be limited to one per user/account</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">8. Refund Policy (No Refunds / Anti-Chargeback Protection)</h3>
              <p className="text-muted-foreground mb-2">
                Unless required by law, all purchases are final and non-refundable, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>unused time remaining in a billing period</li>
                <li>accidental purchases</li>
                <li>failure to cancel before renewal</li>
                <li>dissatisfaction with AI outputs or results</li>
                <li>partial month usage</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                If you believe there was a billing error, you must contact us at smart@smartclips.net within 7 days of the charge.
                Chargebacks and payment disputes may result in immediate account suspension or termination.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">9. User Content & Ownership</h3>
              <p className="text-muted-foreground mb-2">
                "User Content" means any content you upload, submit, create, or edit using SmartClips, including video, audio, images, and text.
              </p>
              <h4 className="font-semibold text-sm mb-1">You Own Your Content</h4>
              <p className="text-muted-foreground mb-2">You retain ownership of your User Content.</p>
              <h4 className="font-semibold text-sm mb-1">License You Grant SmartClips</h4>
              <p className="text-muted-foreground mb-2">
                By uploading or using content on SmartClips, you grant SmartClips a non-exclusive, worldwide, royalty-free license to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>host, store, reproduce, process, edit, transform, and display your User Content</li>
                <li>generate AI outputs requested by you</li>
                <li>provide the Service and related features</li>
                <li>improve platform functionality, reliability, and performance</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">10. AI-Generated Output Disclaimer</h3>
              <p className="text-muted-foreground mb-2">
                SmartClips uses AI systems to generate or assist with edits ("AI Output"). You understand:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>AI Output may be inaccurate, incomplete, low quality, or undesirable</li>
                <li>AI may mishear words, mistranscribe captions, or incorrectly identify objects/speakers</li>
                <li>you are responsible for reviewing and approving content before publishing</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                SmartClips does not guarantee performance, results, virality, growth, reach, or accuracy.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">11. COPYRIGHT + INTELLECTUAL PROPERTY</h3>
              <p className="text-muted-foreground mb-2">
                SmartClips respects intellectual property rights and expects all users to do the same.
              </p>
              <h4 className="font-semibold text-sm mb-1">A. Your Content Must Be Yours</h4>
              <p className="text-muted-foreground mb-2">By uploading content to SmartClips, you represent and warrant that:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>you own the content or you have the necessary rights/licenses to use it; and</li>
                <li>your content does not infringe any third-party rights, including copyrights, trademarks, privacy rights, or publicity rights.</li>
              </ol>
              <p className="text-muted-foreground mt-2">
                You are solely responsible for your uploaded content and any consequences related to its use.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">12. Acceptable Use Policy</h3>
              <p className="text-muted-foreground mb-2">You agree not to use SmartClips for:</p>
              <div className="space-y-2 ml-4">
                <div>
                  <h4 className="font-semibold text-sm">Illegal or Harmful Activity</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>illegal content or criminal activity</li>
                    <li>harassment, threats, hate speech, or violence</li>
                    <li>abuse, exploitation, or sexual content involving minors (zero tolerance)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Copyright / Stolen Content</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>uploading content you do not own or have permission to use</li>
                    <li>infringing third-party copyrights or trademarks</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Fraud / Scams / Deceptive Media</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li>impersonation for fraud</li>
                    <li>generating misleading content used for scams</li>
                    <li>creating deepfake impersonations intended to harm, mislead, or deceive</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">13. Disclaimer of Warranties</h3>
              <p className="text-muted-foreground">
                SmartClips is provided "AS IS" and "AS AVAILABLE." We disclaim all warranties, including merchantability, fitness for a particular purpose, non-infringement, and accuracy or reliability of AI Output.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">14. Limitation of Liability</h3>
              <p className="text-muted-foreground mb-2">
                To the maximum extent permitted by law, SmartClips will not be liable for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>lost profits, lost revenue, or lost business</li>
                <li>lost data or inability to access content</li>
                <li>content removal or account termination</li>
                <li>damages resulting from AI Output accuracy issues</li>
                <li>indirect, special, incidental, or consequential damages</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Total liability is limited to the amount paid by you in the last 30 days, if any.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">15. Indemnification</h3>
              <p className="text-muted-foreground">
                You agree to defend, indemnify, and hold harmless SmartClips, its affiliates, officers, directors, employees, and contractors from and against any claims, liabilities, damages, losses, and costs arising out of or related to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mt-2">
                <li>Your use of SmartClips</li>
                <li>Your User Content</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of applicable law or third-party rights</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">16. Termination</h3>
              <p className="text-muted-foreground mb-2">
                SmartClips may suspend or terminate your account or access to the Service at any time, with or without notice, for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>violation of these Terms</li>
                <li>chargeback disputes</li>
                <li>uploading illegal or harmful content</li>
                <li>fraud, copyright infringement, abuse, or spamming</li>
                <li>any conduct SmartClips deems harmful or inappropriate</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Upon termination, you lose access to your account and data. SmartClips is not responsible for data loss.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">17. Governing Law & Dispute Resolution</h3>
              <p className="text-muted-foreground mb-2">
                These Terms are governed by the laws of the State of Florida, United States, without regard to conflict of law principles.
              </p>
              <p className="text-muted-foreground mb-2">
                Any dispute arising from SmartClips or these Terms will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
              <p className="text-muted-foreground">
                You waive your right to participate in class action lawsuits or class-wide arbitration.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">18. No Guarantees or Promises of Results</h3>
              <p className="text-muted-foreground">
                SmartClips makes no promises regarding virality, revenue, success, reach, or any specific outcomes resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">19. Data & Privacy</h3>
              <p className="text-muted-foreground">
                By using SmartClips, you agree that we may process your content and account information as described in our Privacy Policy.
              </p>
              <p className="text-muted-foreground mt-2">
                SmartClips may use uploaded content for quality control, debugging, and platform improvements in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">20. Changes to the Terms</h3>
              <p className="text-muted-foreground">
                SmartClips may modify these Terms at any time. Changes will be posted here with an updated "Last Updated" date. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">21. Severability</h3>
              <p className="text-muted-foreground">
                If any provision of these Terms is found invalid or unenforceable, the remaining provisions will remain in effect.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-2">22. Contact Information</h3>
              <p className="text-muted-foreground">
                For support, legal requests, billing issues, or DMCA inquiries, contact:
                <br />
                smart@smartclips.net
                <br />
                <br />
                Smartclipsio LLC
                <br />
                Florida, United States
              </p>
            </section>
          </div>
        </ScrollArea>
        {showAcceptButton && (
          <div className="p-6 pt-0 flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onAccept}>
              I Accept
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
