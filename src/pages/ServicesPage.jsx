import React from 'react';
import { Link } from 'react-router-dom';

const services = ["electrician","plumber","ac-repair","painter","carpenter","cleaning","appliance-repair"];
const areas = ["kothrud","katraj","baner","hinjewadi","wakad","hadapsar","kharadi"];

export default function ServicesPage() {
  return (
    <div style={{padding:20}}>
      <h1>Our Services in Pune</h1>
      {services.map(s => (
        <div key={s}>
          <h2>{s}</h2>
          {areas.map(a => <Link key={a} to={`/${s}-in-${a}`} style={{margin:5}}>{s} in {a}</Link>)}
        </div>
      ))}
    </div>
  )
}