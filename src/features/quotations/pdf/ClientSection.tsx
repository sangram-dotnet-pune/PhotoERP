import {
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

import './quotation.css';

interface ClientSectionProps {
  client: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
}

const ClientSection = ({
  client,
}: ClientSectionProps) => {
  return (
    <div className="client-section">

      <p className="client-label">
        TO
      </p>


      <h2
        className="client-name"
      >
        {client.name}
      </h2>


      <div className="client-contact">

        <div className="contact-row">
          <div className="contact-icon">
            <Phone size={16} />
          </div>
          <span>{client.phone}</span>
        </div>


        <div className="contact-row">
          <div className="contact-icon">
            <Mail size={16} />
          </div>
          <span>{client.email}</span>
        </div>


        <div className="contact-row address-row">
          <div className="contact-icon">
            <MapPin size={16} />
          </div>
          <span>{client.address}</span>
        </div>

      </div>

    </div>
  );
};

export default ClientSection;