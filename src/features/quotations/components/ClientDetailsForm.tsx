import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';

import ExistingClientSearch from './ExistingClientSearch';

import { ClientDetails } from '../types/quotation.types';
import type { UseQuotationState } from '../types/quotation.types';
import type { FieldTouched } from '../types/validation.types';
import type { ClientInfo } from '../../clients/types/client.types';

interface ClientDetailsFormProps {
  client: ClientDetails;

  onChange: (
    field: keyof ClientDetails,
    value: string,
  ) => void;

  readOnly?: boolean;

  showClientSelector?: boolean;

  selectedClientId?: number;
  selectedClientName?: string;
  onSelectClient?: (client: ClientInfo) => void;
  onClearClient?: () => void;

  error?: {
    name: string;
    phone: string;
    email: string;
  };

  touched?: {
    name: boolean;
    phone: boolean;
    email: boolean;
  };

  onTouchField?: (field: keyof FieldTouched) => void;
  onValidateField?: (field: keyof FieldTouched, state: UseQuotationState) => void;
  quotationState?: UseQuotationState;
}

const ClientDetailsForm = ({
  client,
  onChange,
  readOnly = false,
  showClientSelector = false,
  selectedClientId,
  selectedClientName,
  onSelectClient,
  onClearClient,
  error,
  touched,
  onTouchField,
  onValidateField,
  quotationState,
}: ClientDetailsFormProps) => {

  const handleChange = (
    field: keyof ClientDetails,
    value: string,
  ) => {
    onChange(field, value);

    if (field === 'name' || field === 'phone' || field === 'email') {
      setTimeout(() => {
        if (quotationState && onValidateField) {
          const updatedState = {
            ...quotationState,
            client: { ...quotationState.client, [field]: value },
          };
          onValidateField(field, updatedState);
        }
      }, 0);
    }
  };

  const handleBlur = (field: keyof FieldTouched) => {
    if (onTouchField) {
      onTouchField(field);
    }
  };

  return (
    <Card title="Client Details">
      {showClientSelector && onSelectClient && onClearClient && (
        <ExistingClientSearch
          selectedClientId={selectedClientId}
          selectedClientName={selectedClientName}
          onSelect={onSelectClient}
          onClear={onClearClient}
        />
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Input
          label="Client Name"
          placeholder="Enter client name"
          required
          readOnly={readOnly}
          value={client.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          error={touched?.name ? error?.name : undefined}
        />

        <Input
          label="Mobile Number"
          placeholder="Enter mobile number"
          type="tel"
          required
          readOnly={readOnly}
          value={client.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          error={touched?.phone ? error?.phone : undefined}
        />

        <Input
          label="Email"
          placeholder="Enter email"
          type="email"
          readOnly={readOnly}
          value={client.email}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          error={touched?.email ? error?.email : undefined}
        />

        <div />
      </div>

      <div className="mt-5">
        <Textarea
          label="Address"
          rows={4}
          placeholder="Enter client address"
          readOnly={readOnly}
          value={client.address}
          onChange={(e) =>
            onChange('address', e.target.value)
          }
        />
      </div>
    </Card>
  );
};

export default ClientDetailsForm;
