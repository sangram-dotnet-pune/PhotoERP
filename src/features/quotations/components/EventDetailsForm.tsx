import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';

import { EventDetails } from '../types/quotation.types';
import type { UseQuotationState } from '../types/quotation.types';
import type { FieldTouched } from '../types/validation.types';

interface EventDetailsFormProps {
  event: EventDetails;

  onChange: (
    field: keyof EventDetails,
    value: string,
  ) => void;

  readOnly?: boolean;

  error?: {
    eventType: string;
    eventDate: string;
  };

  touched?: {
    eventType: boolean;
    eventDate: boolean;
  };

  onTouchField?: (field: keyof FieldTouched) => void;
  onValidateField?: (field: keyof FieldTouched, state: UseQuotationState) => void;
  quotationState?: UseQuotationState;
}

const EventDetailsForm = ({
  event,
  onChange,
  readOnly = false,
  error,
  touched,
  onTouchField,
  onValidateField,
  quotationState,
}: EventDetailsFormProps) => {

  const handleChange = (
    field: keyof EventDetails,
    value: string,
  ) => {
    onChange(field, value);

    if (field === 'eventType' || field === 'eventDate') {
      setTimeout(() => {
        if (quotationState && onValidateField) {
          const updatedState = {
            ...quotationState,
            event: { ...quotationState.event, [field]: value },
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
    <Card title="Event Details">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Event Type */}
        <Input
          label="Event Type"
          placeholder="Enter event type"
          id="event-type"
          name="event-type"
          readOnly={readOnly}
          value={event.eventType}
          onChange={(e) => handleChange('eventType', e.target.value)}
          onBlur={() => handleBlur('eventType')}
          error={touched?.eventType ? error?.eventType : undefined}
        />

        {/* Event Date */}
        <Input
          label="Event Date"
          type="date"
          id="event-date"
          name="event-date"
          readOnly={readOnly}
          value={event.eventDate}
          onChange={(e) => handleChange('eventDate', e.target.value)}
          onBlur={() => handleBlur('eventDate')}
          error={touched?.eventDate ? error?.eventDate : undefined}
        />

        {/* Event Time */}
        <Input
          label="Event Time"
          type="time"
          readOnly={readOnly}
          value={event.eventTime}
          onChange={(e) =>
            onChange('eventTime', e.target.value)
          }
        />

        {/* City */}
        <Input
          label="City"
          placeholder="Enter city"
          readOnly={readOnly}
          value={event.city}
          onChange={(e) =>
            onChange('city', e.target.value)
          }
        />
      </div>

      <div className="mt-5">
        <Input
          label="Venue"
          placeholder="Enter venue"
          readOnly={readOnly}
          value={event.venue}
          onChange={(e) =>
            onChange('venue', e.target.value)
          }
        />
      </div>

      <div className="mt-5">
        <Textarea
          label="Event Notes"
          rows={4}
          placeholder="Additional event information..."
          readOnly={readOnly}
          value={event.eventNotes}
          onChange={(e) =>
            onChange('eventNotes', e.target.value)
          }
        />
      </div>
    </Card>
  );
};

export default EventDetailsForm;
