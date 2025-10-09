export default function PrivacyPage() {
  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 className="section-title" style={{ marginBottom: 24 }}>Privacy Policy</h1>
        <p style={{ color: 'white', marginBottom: 32, fontSize: '16px' }}>
          <strong>Last Updated:</strong> January 20, 2025
        </p>

        <div style={{ lineHeight: 1.6, color: 'white' }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>1. Introduction</h2>
            <p>
              Auro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service"). Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>2. Information We Collect</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>2.1 Personal Information</h3>
            <p>We collect information you provide directly to us, including:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Account information (name, email address, phone number)</li>
              <li>Profile information (bio, profile photos, social media handles)</li>
              <li>Content you upload (photos, videos, messages for reviews)</li>
              <li>Payment information (processed securely through Stripe)</li>
              <li>Communication preferences and marketing consent</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>2.2 Google User Data</h3>
            <p>When you sign in with Google, we access the following data:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Basic profile information (name, email address, profile picture)</li>
              <li>Google account ID for authentication purposes</li>
            </ul>
            <p><strong>We do not access your Google Drive, Gmail, Calendar, or any other Google services beyond basic profile information.</strong></p>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>2.3 Social Media Data</h3>
            <p>If you choose to connect social media accounts, we may collect:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Instagram and TikTok usernames and basic profile information</li>
              <li>Public content you choose to share for review purposes</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>2.4 Automatically Collected Information</h3>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Device information (device type, operating system, unique device identifiers)</li>
              <li>Usage data (pages visited, features used, time spent on the Service)</li>
              <li>Log data (IP address, browser type, access times, referring URLs)</li>
              <li>Location data (if you grant permission)</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Provide, maintain, and improve our Service</li>
              <li>Process transactions and send related information</li>
              <li>Match users with appropriate reviewers</li>
              <li>Send technical notices, updates, security alerts, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Communicate about products, services, and promotional offers</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>4. Information Sharing and Disclosure</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.1 With Your Consent</h3>
            <p>We share your information with your explicit consent, including:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Sharing your photos and content with selected reviewers</li>
              <li>Publishing reviews on social media (only with your explicit consent)</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.2 Service Providers</h3>
            <p>We share information with third-party service providers who assist us in operating our Service:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Google:</strong> Authentication services</li>
              <li><strong>SMS Providers:</strong> Two-factor authentication</li>
              <li><strong>Cloud Storage:</strong> File storage and delivery</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.3 Legal Requirements</h3>
            <p>We may disclose your information if required by law or to:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Comply with legal process or government requests</li>
              <li>Enforce our Terms of Service</li>
              <li>Protect the rights, property, or safety of Auro, our users, or others</li>
              <li>Prevent fraud or abuse of our Service</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>4.4 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>5. Data Storage and Protection</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>5.1 Security Measures</h3>
            <p>We implement appropriate technical and organizational measures to protect your information:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal information on a need-to-know basis</li>
              <li>Secure data centers with physical and environmental controls</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>5.2 Data Location</h3>
            <p>Your information is stored on secure servers operated by our service providers, primarily in the United States. We ensure that any international transfers comply with applicable data protection laws.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>6. Data Retention and Deletion</h2>
            
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.1 Retention Periods</h3>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li><strong>Account Information:</strong> Retained while your account is active and for up to 3 years after account closure</li>
              <li><strong>Review Content:</strong> Automatically deleted after 30 days unless you request otherwise</li>
              <li><strong>Payment Information:</strong> Retained as required by law and for accounting purposes</li>
              <li><strong>Communication Records:</strong> Retained for up to 2 years for customer service purposes</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.2 Your Rights</h3>
            <p>You have the right to:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h3 style={{ color: 'white', marginBottom: 12, fontSize: '20px' }}>6.3 Data Deletion Process</h3>
            <p>To request deletion of your data:</p>
            <ol style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Contact us at <a href="mailto:privacy@auro.app" style={{ color: 'var(--text)' }}>privacy@auro.app</a></li>
              <li>We will verify your identity</li>
              <li>We will delete your data within 30 days of verification</li>
              <li>We will confirm deletion in writing</li>
            </ol>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>7. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Remember your preferences and settings</li>
              <li>Analyze how you use our Service</li>
              <li>Provide personalized content and advertisements</li>
              <li>Improve our Service performance</li>
            </ul>
            <p>You can control cookies through your browser settings, but disabling cookies may affect Service functionality.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>8. Children's Privacy</h2>
            <p>Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>9. International Users</h2>
            <p>If you are accessing our Service from outside the United States, please be aware that your information may be transferred to, stored, and processed in the United States where our servers are located. By using our Service, you consent to the transfer of your information to the United States.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>10. California Privacy Rights</h2>
            <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Right to know what personal information is collected</li>
              <li>Right to delete personal information</li>
              <li>Right to opt-out of the sale of personal information (we do not sell personal information)</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>11. European Union Users</h2>
            <p>If you are in the European Union, you have rights under the General Data Protection Regulation (GDPR):</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Right of access to your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Rights related to automated decision-making</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>12. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically for any changes.</p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: 'white', marginBottom: 16, fontSize: '24px' }}>13. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or our privacy practices, please contact us:</p>
            <ul style={{ marginLeft: 20, marginBottom: 16 }}>
              <li>Email: <a href="mailto:privacy@auro.app" style={{ color: 'white' }}>privacy@auro.app</a></li>
              <li>General Support: <a href="mailto:support@auro.app" style={{ color: 'white' }}>support@auro.app</a></li>
              <li>Website: <a href="https://www.appauro.com" style={{ color: 'white' }}>www.appauro.com</a></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}


