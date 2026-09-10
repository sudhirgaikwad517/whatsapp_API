import React, { useState } from 'react';
import { NavTab } from '@/types';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';

// Home Section Components
import { Hero } from '@/components/home/hero';
import { TrustedBrands } from '@/components/home/trusted-brands';
import { KeyBenefits } from '@/components/home/key-benefits';
import { DemoShowcase } from '@/components/home/demo-showcase';
import { CTASection } from '@/components/home/cta-section';

// Tool Components
import { WhatsAppLinkGeneratorComponent } from '@/components/whatsapp-link-generator-component';
import { QrGeneratorComponent } from '@/components/qr-generator-component';
import { TemplateBuilderComponent } from '@/components/template-builder-component';

// Page Components
import { FeaturesPage } from '@/pages/FeaturesPage';
import { SolutionsPage } from '@/pages/SolutionsPage';
import { PricingPage } from '@/pages/PricingPage';
import { DocsPage } from '@/pages/DocsPage';
import { ContactPage } from '@/pages/ContactPage';
import { DemoPage } from '@/pages/DemoPage';
import { AboutPage } from '@/pages/AboutPage';
import { CareersPage } from '@/pages/CareersPage';
import { BrandingPage } from '@/pages/BrandingPage';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { RefundPage } from '@/pages/RefundPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VisitorLeadPopup } from '@/components/VisitorLeadPopup';
export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [resetToken, setResetToken] = useState('');
  const [verified, setVerified] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'true') {
      import('@/store/auth.store').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
      window.history.replaceState({}, document.title, window.location.pathname);
      setCurrentTab('login');
    }

    // Capture these before stripping the query string below, so the target
    // page still has them even though the URL itself gets cleaned up.
    const token = params.get('token');
    if (token) setResetToken(token);
    const verifiedParam = params.get('verified');
    if (verifiedParam) setVerified(verifiedParam);

    const tabParam = params.get('tab') as NavTab | null;
    if (tabParam) {
      setCurrentTab(tabParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleNavigate = (tab: NavTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return (
          <div className="space-y-0">
            <Hero onNavigate={handleNavigate} />
            <TrustedBrands />
            <KeyBenefits onNavigate={handleNavigate} />
            <DemoShowcase />
            <CTASection onNavigate={handleNavigate} />
          </div>
        );
      case 'features':
        return <FeaturesPage onNavigate={handleNavigate} />;
      case 'solutions':
        return <SolutionsPage onNavigate={handleNavigate} />;
      case 'pricing':
        return <PricingPage onNavigate={handleNavigate} />;
      case 'docs':
        return <DocsPage />;
      case 'contact':
        return <ContactPage />;
      case 'demo':
        return <DemoPage />;
      case 'about':
        return <AboutPage onNavigate={handleNavigate} />;
      case 'careers':
        return <CareersPage />;
      case 'branding':
        return <BrandingPage />;
      case 'terms':
        return <TermsPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'refund':
        return <RefundPage />;
      case 'customers':
        return <CustomersPage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} verified={verified} />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={handleNavigate} />;
      case 'reset-password':
        return <ResetPasswordPage onNavigate={handleNavigate} token={resetToken} />;
      case 'link-generator':
        return (
          <div className="py-12 px-4 max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-white">WhatsApp Link Generator</h1>
              <p className="text-sm text-slate-400">Create click-to-chat links with custom pre-filled greetings</p>
            </div>
            <WhatsAppLinkGeneratorComponent />
          </div>
        );
      case 'qr-generator':
        return (
          <div className="py-12 px-4 max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-white">WhatsApp QR Code Generator</h1>
              <p className="text-sm text-slate-400">Generate high-resolution PNG QR codes for marketing & packaging</p>
            </div>
            <QrGeneratorComponent />
          </div>
        );
      case 'template-builder':
        return (
          <div className="py-12 px-4 max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-extrabold text-white">HSM Message Template Builder</h1>
              <p className="text-sm text-slate-400">Design and preview Meta WhatsApp rich message templates in real-time</p>
            </div>
            <TemplateBuilderComponent />
          </div>
        );
      default:
        return (
          <div className="space-y-0">
            <Hero onNavigate={handleNavigate} />
            <TrustedBrands />
            <KeyBenefits onNavigate={handleNavigate} />
            <DemoShowcase />
            <CTASection onNavigate={handleNavigate} />
          </div>
        );
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <Navbar currentTab={currentTab} onNavigate={handleNavigate} />
        <main className="flex-grow">{renderContent()}</main>
        <Footer onNavigate={handleNavigate} />
        <VisitorLeadPopup onNavigate={handleNavigate} />
      </div>
    </ThemeProvider>
  );
}

export default App;
