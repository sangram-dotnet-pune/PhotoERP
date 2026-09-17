import {
  Calendar,
  Clock3,
  MapPin,
  Star,
} from 'lucide-react';

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
  icon: React.ReactNode;
  label: string;
  value: string;
}


const Row = ({
  icon,
  label,
  value,
}: RowProps) => (

  <div className="event-row">

    <div className="event-icon">
      {icon}
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


const EventSection = ({
  event,
}: EventSectionProps) => {

  return (

    <div className="event-section">

      <p className="event-title">
        EVENT DETAILS
      </p>


<Row
  icon={<Star />}
  label="Event Type"
  value={event.eventType}
/>

<Row
  icon={<Calendar />}
  label="Event Date"
  value={event.eventDate}
/>

{event.eventTime && (
  <Row
    icon={<Clock3 />}
    label="Event Time"
    value={event.eventTime}
  />
)}

<Row
  icon={<MapPin />}
  label="Venue"
  value={`${event.venue}, ${event.city}`}
/>

{event.eventNotes && (
  <Row
    icon={<Star />}
    label="Notes"
    value={event.eventNotes}
  />
)}


    </div>

  );
};


export default EventSection;