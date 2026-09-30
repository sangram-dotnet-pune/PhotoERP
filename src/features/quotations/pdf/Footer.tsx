import { Mail, Phone } from 'lucide-react';

import {
  FaInstagram,
  FaFacebookF,
  FaYoutube,
} from 'react-icons/fa';

interface FooterProps {
  phone: string;
  email: string;
  footerText: string;
  showContact: boolean;
}

const Footer = ({
  phone,
  email,
  footerText,
  showContact,
}: FooterProps) => {
  return (
    <footer className="quotation-footer">
      <div className="footer-content">
        {showContact ? (
          <>
            <div className="footer-contact">
              <div className="footer-row">
                <div className="footer-icon">
                  <Phone size={15} />
                </div>
                <span>{phone}</span>
              </div>

              <div className="footer-row">
                <div className="footer-icon">
                  <Mail size={15} />
                </div>
                <span>{email}</span>
              </div>
            </div>

            <div className="social-icons">
              <div className="social-circle">
                <FaInstagram size={16} />
              </div>

              <div className="social-circle">
                <FaFacebookF size={16} />
              </div>

              <div className="social-circle">
                <FaYoutube size={16} />
              </div>
            </div>

            <div
              className="thank-you"
              style={{
                fontFamily:
                  "'Dancing Script', cursive",
              }}
            >
              {footerText}
            </div>
          </>
        ) : (
          <div
            className="thank-you"
            style={{
              fontFamily: "'Dancing Script', cursive",
              textAlign: 'center',
            }}
          >
            {footerText}
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;