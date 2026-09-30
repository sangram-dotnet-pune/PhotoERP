import {
  calendarUri,
  clock3Uri,
  mapPinUri,
  starUri,
} from './eventIcons';

interface EventSectionProps {
  event: {
    eventType: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    city: string;
    eventNotes: string;
  };
}

interface RowProps {
  icon: string;
  label: string;
  value: string;
}

const Row = ({ icon, label, value }: RowProps) => (
  <div className="event-row">
    <div className="event-icon">
      <img
        src={icon}
        width={16}
        height={16}
        alt=""
      />
    </div>

    <span className="event-label">
      {label}
    </span>

    <span className="event-colon">
      :
    </span>

    <span className="event-value">
      {value}
    </span>
  </div>
);

const EventSection = ({ event }: EventSectionProps) => {
  return (
    <div className="event-section">
      <p className="event-title">
        EVENT DETAILS
      </p>

      <Row
        icon={starUri}
        label="Event Type"
        value={event.eventType}
      />

      <Row
        icon={calendarUri}
        label="Event Date"
        value={event.eventDate}
      />

      {event.eventTime && (
        <Row
          icon={clock3Uri}
          label="Event Time"
          value={event.eventTime}
        />
      )}

      <Row
        icon={mapPinUri}
        label="Venue"
        value={`${event.venue}, ${event.city}`}
      />

      {event.eventNotes && (
        <Row
          icon={starUri}
          label="Notes"
          value={event.eventNotes}
        />
      )}
    </div>
  );
};

export default EventSection;