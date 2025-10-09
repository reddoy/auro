export default function TermsPage() {
  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 className="section-title" style={{ marginBottom: 24 }}>Terms of Service</h1>
        <p style={{ color: 'white', marginBottom: 32, fontSize: '16px' }}>
          <strong>Last Updated:</strong> January 20, 2025
        </p>

        <div style={{ lineHeight: 1.6, color: 'white' }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>1. Acceptance of Terms</h2>
            <p>
              Welcome to Auro! These Terms of Service ("Terms") govern your use of our mobile application, website, and related services (collectively, the "Service") operated by Auro ("we," "our," or "us"). By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, then you may not access the Service.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>2. Description of Service</h2>
            <p>
              Auro is a platform that connects users seeking style and content reviews with qualified reviewers. Our Service allows users to:
            </p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Upload photos and content for review</li>
              <li>Connect with professional reviewers</li>
              <li>Receive personalized feedback and recommendations</li>
              <li>Access educational content and style guidance</li>
              <li>Process payments for review services</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>3. User Accounts</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>3.1 Account Creation</h3>
            <p>To use certain features of our Service, you must create an account. You agree to:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>3.2 Account Termination</h3>
            <p>We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>4. User Responsibilities and Conduct</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.1 Acceptable Use</h3>
            <p>You agree to use our Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Upload, post, or transmit harmful, offensive, or inappropriate content</li>
              <li>Impersonate any person or entity</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated systems to access the Service</li>
              <li>Reverse engineer or attempt to extract source code</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.2 Content Standards</h3>
            <p>All content you upload must:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Be original or properly licensed</li>
              <li>Not contain nudity, violence, or illegal content</li>
              <li>Not infringe on intellectual property rights</li>
              <li>Be appropriate for a general audience</li>
              <li>Comply with our community guidelines</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.3 Prohibited Content</h3>
            <p>You may not upload content that:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Contains explicit sexual content or nudity</li>
              <li>Promotes violence, hate speech, or discrimination</li>
              <li>Contains illegal activities or substances</li>
              <li>Violates privacy rights of others</li>
              <li>Contains spam, malware, or malicious code</li>
              <li>Is defamatory, harassing, or threatening</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>5. Review Services</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>5.1 Service Description</h3>
            <p>Our review services include:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Style and fashion consultations</li>
              <li>Content and photo reviews</li>
              <li>Personalized recommendations</li>
              <li>Educational feedback and guidance</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>5.2 Reviewer Qualifications</h3>
            <p>All reviewers on our platform are vetted professionals with relevant experience and expertise. However, we do not guarantee the quality or accuracy of individual reviews.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>5.3 Review Process</h3>
            <p>Reviews are typically completed within the timeframe specified at the time of purchase. We reserve the right to extend review times due to high demand or other circumstances.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>6. Payments and Refunds</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.1 Payment Processing</h3>
            <p>All payments are processed securely through Stripe. By making a payment, you agree to Stripe's terms of service and privacy policy.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.2 Pricing</h3>
            <p>Prices for our services are displayed at the time of purchase and are subject to change. We reserve the right to modify prices at any time with notice.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.3 Refund Policy</h3>
            <p>Refunds are handled on a case-by-case basis. Generally:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Refunds may be issued if a review is not completed within the promised timeframe</li>
              <li>Refunds may be issued for technical issues preventing service delivery</li>
              <li>No refunds for completed reviews or user dissatisfaction with review content</li>
              <li>Refund requests must be submitted within 30 days of purchase</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.4 Chargebacks</h3>
            <p>Unauthorized chargebacks may result in account suspension or termination. If you have a billing dispute, please contact us directly before initiating a chargeback.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>7. Intellectual Property Rights</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>7.1 Our Content</h3>
            <p>The Service and its original content, features, and functionality are owned by Auro and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>7.2 User Content</h3>
            <p>You retain ownership of content you upload to our Service. By uploading content, you grant us a non-exclusive, royalty-free license to use, display, and distribute your content for the purpose of providing our Service.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>7.3 Copyright Infringement</h3>
            <p>We respect intellectual property rights and will respond to valid DMCA takedown notices. If you believe your copyright has been infringed, please contact us with the required information.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>8. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our Service, you consent to the collection and use of information as described in our Privacy Policy.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>9. Disclaimers and Limitations of Liability</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>9.1 Service Availability</h3>
            <p>We strive to provide continuous service availability but cannot guarantee uninterrupted access. The Service is provided "as is" and "as available" without warranties of any kind.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>9.2 Limitation of Liability</h3>
            <p>To the maximum extent permitted by law, Auro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising out of or relating to your use of the Service.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>9.3 Maximum Liability</h3>
            <p>Our total liability to you for any claims arising from or relating to these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>10. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless Auro and its officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including attorney's fees) arising from:
            </p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Content you upload or share</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>11. Termination</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>11.1 Termination by You</h3>
            <p>You may terminate your account at any time by contacting us or using the account deletion feature in the Service.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>11.2 Termination by Us</h3>
            <p>We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>11.3 Effect of Termination</h3>
            <p>Upon termination, your right to use the Service will cease immediately. Provisions of these Terms that by their nature should survive termination shall survive.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>12. Dispute Resolution</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>12.1 Governing Law</h3>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>12.2 Arbitration</h3>
            <p>Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>12.3 Class Action Waiver</h3>
            <p>You agree that any arbitration or court proceeding shall be limited to the dispute between you and Auro individually. You waive any right to participate in class action lawsuits or class-wide arbitration.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>13. Third-Party Services</h2>
            <p>
              Our Service may contain links to third-party websites or services. We are not responsible for the content, privacy policies, or practices of any third-party websites or services. You acknowledge and agree that we shall not be responsible or liable for any damage or loss caused by your use of any third-party services.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>14. Force Majeure</h2>
            <p>
              We shall not be liable for any failure or delay in performance under these Terms which is due to fire, flood, earthquake, elements of nature, acts of God, acts of war, terrorism, labor strikes, or any other cause which is beyond our reasonable control.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>15. Severability</h2>
            <p>
              If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>16. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Auro regarding the use of the Service and supersede all prior agreements and understandings.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>17. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>18. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Email: <a href="mailto:legal@auro.app" style={{ color: 'white' }}>legal@auro.app</a></li>
              <li>General Support: <a href="mailto:support@auro.app" style={{ color: 'white' }}>support@auro.app</a></li>
              <li>Website: <a href="https://www.appauro.com" style={{ color: 'white' }}>www.appauro.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}


