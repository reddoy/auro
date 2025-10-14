'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowRight, DollarSign, Star, Clock, CheckCircle } from 'lucide-react';

type Props = {
  onNext: () => void;
};

export default function IntroStep({ onNext }: Props) {
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const desktopOverlayRef = useRef<HTMLDivElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  // Video handling for desktop
  useEffect(() => {
    const video = desktopVideoRef.current;
    const overlay = desktopOverlayRef.current;

    if (!video || !overlay) return;

    const handleVideoEnd = () => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        overlay.style.opacity = '0';
        video.currentTime = 0;
        video.play();
      }, 5000);
    };

    video.addEventListener('ended', handleVideoEnd);
    return () => video.removeEventListener('ended', handleVideoEnd);
  }, []);

  // Video handling for mobile
  useEffect(() => {
    const video = mobileVideoRef.current;
    const overlay = mobileOverlayRef.current;

    if (!video || !overlay) return;

    const handleVideoEnd = () => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        overlay.style.opacity = '0';
        video.currentTime = 0;
        video.play();
      }, 5000);
    };

    video.addEventListener('ended', handleVideoEnd);
    return () => video.removeEventListener('ended', handleVideoEnd);
  }, []);

  return (
    <div className="intro-step-container">
      {/* Mobile Layout */}
      <div className="mobile-intro lg:hidden">
        <div className="mobile-intro-content">
          {/* Main Headline */}
          <div className="intro-headline">
            <h1 className="intro-title mobile-text-reveal" style={{ animationDelay: '0.2s' }}>
              <span className="block text-white">
                Get Expert <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">Dating Profile Feedback</span>
              </span>
            </h1>
            
            <p className="intro-subtitle mobile-text-reveal" style={{ animationDelay: '0.4s' }}>
              Receive honest, personalized reviews from women on your dating profile to maximize your matches
            </p>
          </div>

          {/* CTA Button */}
          <div className="intro-cta mobile-text-reveal" style={{ animationDelay: '0.6s' }}>
            <button 
              onClick={onNext}
              className="cta-button mobile-gradient-border mobile-touch-feedback mobile-optimized"
            >
              <span>Get Started</span>
              <ArrowRight className="cta-arrow" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="desktop-intro hidden lg:grid">
        <div className="desktop-intro-content">
          {/* Left Content */}
          <div className="desktop-left">
            <div className="intro-headline">
              <h1 className="intro-title-desktop">
                <span className="block text-white pb-2">
                  Get Expert <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">Dating Profile Feedback</span>
                </span>
              </h1>
              
              <p className="intro-subtitle-desktop">
                Receive honest, personalized reviews from women on your dating profile to maximize your matches.
                <span className="block mt-3 text-lg text-white/80">
                  Our expert reviewers will help you stand out and get more dates.
                </span>
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="desktop-benefits">
              <div className="desktop-benefit-card">
                <div className="benefit-icon-circle">
                  <Star className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="benefit-title">Real Feedback</h3>
                  <p className="benefit-desc">Get honest reviews from women</p>
                </div>
              </div>
              
              <div className="desktop-benefit-card">
                <div className="benefit-icon-circle">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="benefit-title">Video Reviews</h3>
                  <p className="benefit-desc">Personalized video feedback</p>
                </div>
              </div>
              
              <div className="desktop-benefit-card">
                <div className="benefit-icon-circle">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="benefit-title">Better Results</h3>
                  <p className="benefit-desc">Improve your match rate</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="desktop-cta">
              <button 
                onClick={onNext}
                className="cta-button-desktop"
              >
                <span>🚀 Request a Review Now</span>
                <ArrowRight className="cta-arrow" />
              </button>
            </div>
          </div>
          
          {/* Right Content - Desktop iPhone Video */}
          <div className="desktop-right">
            <div className="desktop-iphone-wrapper">
              <div className="desktop-iphone-frame">
                <video 
                  ref={desktopVideoRef}
                  className="desktop-iphone-video"
                  src="/katie_demo.mov" 
                  autoPlay 
                  muted 
                  playsInline
                  loop
                  aria-label="Demo video showing how Auro app works"
                />
                <div ref={desktopOverlayRef} className="desktop-iphone-overlay">
                  <div className="overlay-content">
                    <h3>Review & Get Paid</h3>
                    <p>See how easy it is to earn money</p>
                  </div>
                </div>
              </div>
              
              {/* Floating Benefit Callouts */}
              <div className="floating-callout floating-callout-top">
                <Star className="w-4 h-4 text-orange-500" />
                <span>Honest feedback from women</span>
              </div>
              
              <div className="floating-callout floating-callout-bottom">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Video reviews included</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .intro-step-container {
          min-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
        }

        /* Mobile Styles */
        .mobile-intro {
          width: 100%;
        }

        .mobile-intro-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .intro-headline {
          text-align: center;
        }

        .intro-title {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .intro-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          font-weight: 500;
        }

        .intro-benefits {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(8px);
          border-radius: 1rem;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: white;
          font-size: 1rem;
          font-weight: 500;
        }

        .benefit-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #10b981;
          flex-shrink: 0;
        }

        .intro-cta {
          display: flex;
          justify-content: center;
        }

        .cta-button {
          width: 100%;
          max-width: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #cc3597 0%, #e34271 100%);
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 40px rgba(204, 53, 151, 0.4);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 50px rgba(204, 53, 151, 0.5);
        }

        .cta-arrow {
          width: 1.25rem;
          height: 1.25rem;
          transition: transform 0.3s ease;
        }

        .cta-button:hover .cta-arrow {
          transform: translateX(4px);
        }

        .mobile-iphone-wrapper {
          display: flex;
          justify-content: center;
          padding: 1rem 0;
        }

        .intro-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .trust-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trust-icon {
          width: 1rem;
          height: 1rem;
          color: #10b981;
        }

        /* Desktop Styles */
        .desktop-intro {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .desktop-intro-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .desktop-left {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .intro-title-desktop {
          font-size: 3rem;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .intro-subtitle-desktop {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          font-weight: 500;
        }

        .desktop-benefits {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .desktop-benefit-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(8px);
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .desktop-benefit-card:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateX(8px);
        }

        .benefit-icon-circle {
          width: 3rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .benefit-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          margin-bottom: 0.25rem;
        }

        .benefit-desc {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .desktop-cta {
          margin-top: 1rem;
        }

        .cta-button-desktop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1.25rem 2rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #cc3597 0%, #e34271 100%);
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 20px 50px rgba(204, 53, 151, 0.4);
        }

        .cta-button-desktop:hover {
          transform: translateY(-2px);
          box-shadow: 0 25px 60px rgba(204, 53, 151, 0.5);
        }

        .desktop-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .desktop-right {
          position: relative;
        }

        .desktop-iphone-wrapper {
          position: relative;
        }

        .desktop-iphone-frame {
          position: relative;
          width: 300px;
          max-width: 100%;
          aspect-ratio: 9 / 19.5;
          border: 8px solid #000;
          border-radius: 30px;
          background: #000;
          overflow: hidden;
          box-shadow: 
            0 0 30px rgba(236, 72, 153, 0.6),
            0 0 60px rgba(236, 72, 153, 0.4),
            0 0 90px rgba(236, 72, 153, 0.2),
            0 0 20px rgba(0,0,0,0.4);
          margin: 0 auto;
          animation: iphone-glow-pulse 3s ease-in-out infinite;
        }

        @keyframes iphone-glow-pulse {
          0%, 100% { 
            box-shadow: 
              0 0 30px rgba(236, 72, 153, 0.6),
              0 0 60px rgba(236, 72, 153, 0.4),
              0 0 90px rgba(236, 72, 153, 0.2),
              0 0 20px rgba(0,0,0,0.4);
          }
          50% { 
            box-shadow: 
              0 0 40px rgba(236, 72, 153, 0.8),
              0 0 80px rgba(236, 72, 153, 0.6),
              0 0 120px rgba(236, 72, 153, 0.3),
              0 0 20px rgba(0,0,0,0.4);
          }
        }

        .desktop-iphone-frame::before {
          content: '';
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 24px;
          background: #000;
          border-radius: 16px;
          z-index: 2;
        }

        .desktop-iphone-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 22px;
        }

        .desktop-iphone-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #6C63FF, #FF6584);
          color: white;
          opacity: 0;
          transition: opacity 1s ease;
          text-align: center;
          padding: 1.5rem;
          z-index: 3;
        }

        .desktop-iphone-overlay .overlay-content h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .desktop-iphone-overlay .overlay-content p {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .mobile-iphone-frame {
          position: relative;
          width: 280px;
          height: 560px;
          border: 6px solid #1a1a1a;
          border-radius: 28px;
          background: #000;
          overflow: hidden;
          box-shadow: 
            0 0 25px rgba(236, 72, 153, 0.6),
            0 0 50px rgba(236, 72, 153, 0.4),
            0 0 75px rgba(236, 72, 153, 0.2),
            0 0 30px rgba(0,0,0,0.6),
            inset 0 0 20px rgba(255,255,255,0.05);
          margin: 0 auto;
          animation: mobile-iphone-glow-pulse 3s ease-in-out infinite;
        }

        @keyframes mobile-iphone-glow-pulse {
          0%, 100% { 
            box-shadow: 
              0 0 25px rgba(236, 72, 153, 0.6),
              0 0 50px rgba(236, 72, 153, 0.4),
              0 0 75px rgba(236, 72, 153, 0.2),
              0 0 30px rgba(0,0,0,0.6),
              inset 0 0 20px rgba(255,255,255,0.05);
          }
          50% { 
            box-shadow: 
              0 0 35px rgba(236, 72, 153, 0.8),
              0 0 70px rgba(236, 72, 153, 0.6),
              0 0 105px rgba(236, 72, 153, 0.3),
              0 0 30px rgba(0,0,0,0.6),
              inset 0 0 20px rgba(255,255,255,0.05);
          }
        }

        .mobile-iphone-frame::before {
          content: '';
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 20px;
          background: #1a1a1a;
          border-radius: 12px;
          z-index: 2;
        }

        .mobile-iphone-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 22px;
        }

        .mobile-iphone-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
          color: white;
          opacity: 0;
          transition: opacity 1s ease;
          text-align: center;
          padding: 1.5rem;
          z-index: 3;
        }

        .mobile-iphone-overlay .overlay-content h3 {
          font-size: 1.1rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .mobile-iphone-overlay .overlay-content p {
          font-size: 0.85rem;
          opacity: 0.9;
        }

        .floating-callout {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slide-in-right 0.8s ease-out;
        }

        .floating-callout-top {
          top: 1rem;
          right: -1rem;
        }

        .floating-callout-bottom {
          bottom: 1rem;
          right: -1rem;
          animation-delay: 0.3s;
        }

        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes mobile-text-slide-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes mobile-iphone-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes mobile-glow-pulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .intro-title {
            font-size: 1.75rem;
          }

          .intro-subtitle {
            font-size: 1rem;
          }

          .cta-button {
            font-size: 1rem;
            padding: 0.875rem 1.5rem;
          }

          .mobile-iphone-frame {
            width: 240px;
            height: 480px;
          }
        }

        @media (min-width: 1024px) and (max-width: 1280px) {
          .desktop-intro-content {
            gap: 2rem;
          }

          .intro-title-desktop {
            font-size: 2.5rem;
          }

          .desktop-iphone-frame {
            width: 260px;
          }
        }
      `}</style>
    </div>
  );
}

