import { Camera } from 'lucide-react';

import type { ServiceTableStyle } from '../../../types/templateSettings';

interface ServicesSectionProps {
  services: {
    id: number;
    serviceName: string;
    quantity: number;
    price: number;
  }[];
  showPrices: boolean;
  tableStyle: ServiceTableStyle;
}

const ServicesSection = ({
  services,
  showPrices,
  tableStyle,
}: ServicesSectionProps) => {
  const tableClass =
    tableStyle === 'bordered'
      ? 'package-table package-table-bordered'
      : tableStyle === 'minimal'
        ? 'package-table package-table-minimal'
        : 'package-table';

  return (
    <section className="package-section">
      {tableStyle === 'ribbon' && (
        <div className="package-ribbon">PACKAGE DETAILS</div>
      )}

      <table className={tableClass}>
        <thead>
          <tr>
            <th className="icon-column"></th>
            <th className="description-column">Description</th>

            {showPrices && (
              <th className="price-column">Price (₹)</th>
            )}
          </tr>
        </thead>

        <tbody>
          {services.length === 0 ? (
            <tr>
              <td colSpan={showPrices ? 3 : 2} className="empty-row">
                No services added.
              </td>
            </tr>
          ) : (
            services.map((service) => (
              <tr key={service.id}>
                <td>
                  <div className="service-icon">
                    <Camera size={18} />
                  </div>
                </td>

                <td className="service-name">{service.serviceName}</td>

                {showPrices && (
                  <td className="service-price">
                    ₹{' '}
                    {service.price.toLocaleString('en-IN')}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
};

export default ServicesSection;