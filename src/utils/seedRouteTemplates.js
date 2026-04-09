// seedRouteTemplates.js — One-time seed for routeTemplates/ in Firebase.
// Safe to call on every mount: exits immediately if data already exists.
import { ref, get, set } from "firebase/database";

const templates = [
  {
    id: "midwest-tuesday",
    name: "Midwest",
    dayOfWeek: "tuesday",
    source: "Midwest Facility",
    destination: "IMPACT Center",
    departureTime: "10:15 AM",
    arrivalTime: "10:30 PM",
    vehicle: "F650 26ft Box Truck",
    driversNeeded: 2
  },
  {
    id: "2nd-helpings-tuesday",
    name: "2nd Helpings",
    dayOfWeek: "tuesday",
    source: "2nd Helpings",
    destination: "IMPACT Center",
    departureTime: "1:00 PM",
    arrivalTime: "1:30 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "2nd-helpings-friday",
    name: "2nd Helpings",
    dayOfWeek: "friday",
    source: "2nd Helpings",
    destination: "IMPACT Center",
    departureTime: "8:30 AM",
    arrivalTime: "12:30 PM",
    vehicle: "Small/Large Box Truck",
    driversNeeded: 1
  },
  {
    id: "interchurch-franklin-tuesday",
    name: "Interchurch Franklin",
    dayOfWeek: "tuesday",
    source: "Interchurch Franklin",
    destination: "IMPACT Center",
    departureTime: "1:30 PM",
    arrivalTime: "2:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "mpcc-indy-southeast-tuesday",
    name: "MPCC Indy Southeast",
    dayOfWeek: "tuesday",
    source: "MPCC Indy Southeast",
    destination: "IMPACT Center",
    departureTime: "4:30 PM",
    arrivalTime: "5:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "kroger-wednesday",
    name: "4 Kroger Pick Ups",
    dayOfWeek: "wednesday",
    source: "Kroger Locations",
    destination: "IMPACT Center",
    departureTime: "8:40 AM",
    arrivalTime: "9:00 AM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "impact-fairfax-wednesday",
    name: "Impact Fairfax Pantry",
    dayOfWeek: "wednesday",
    source: "IMPACT Center",
    destination: "Impact Fairfax Pantry",
    departureTime: "8:30 AM",
    arrivalTime: "5:15 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "longs-donuts-thursday",
    name: "Longs Donuts",
    dayOfWeek: "thursday",
    source: "Longs Donuts",
    destination: "IMPACT Center",
    departureTime: "8:30 AM",
    arrivalTime: "9:00 AM",
    vehicle: "Small 16ft Box Truck",
    driversNeeded: 1
  },
  {
    id: "walmart-thursday",
    name: "Walmart SR-135",
    dayOfWeek: "thursday",
    source: "Walmart SR-135",
    destination: "IMPACT Center",
    departureTime: "10:30 AM",
    arrivalTime: "11:00 AM",
    vehicle: "Small 16ft Box Truck",
    driversNeeded: 1
  },
  {
    id: "cg-school-thursday",
    name: "CG School",
    dayOfWeek: "thursday",
    source: "CG School",
    destination: "IMPACT Center",
    departureTime: "9:15 AM",
    arrivalTime: "10:00 AM",
    vehicle: "Small 16ft Box Truck",
    driversNeeded: 2
  },
  {
    id: "wawa-monday",
    name: "Wawa",
    dayOfWeek: "monday",
    source: "Wawa Plainfield",
    destination: "IMPACT Center",
    departureTime: "1:20 PM",
    arrivalTime: "2:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "wawa-tuesday",
    name: "Wawa",
    dayOfWeek: "tuesday",
    source: "Wawa Plainfield",
    destination: "IMPACT Center",
    departureTime: "1:20 PM",
    arrivalTime: "2:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "wawa-wednesday",
    name: "Wawa",
    dayOfWeek: "wednesday",
    source: "Wawa Plainfield",
    destination: "IMPACT Center",
    departureTime: "1:20 PM",
    arrivalTime: "2:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "wawa-thursday",
    name: "Wawa",
    dayOfWeek: "thursday",
    source: "Wawa Plainfield",
    destination: "IMPACT Center",
    departureTime: "1:20 PM",
    arrivalTime: "2:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
  {
    id: "wawa-friday",
    name: "Wawa",
    dayOfWeek: "friday",
    source: "Wawa Plainfield",
    destination: "IMPACT Center",
    departureTime: "1:20 PM",
    arrivalTime: "2:00 PM",
    vehicle: "IC Van",
    driversNeeded: 1
  },
];

const seedRouteTemplates = async (db) => {
  const snapshot = await get(ref(db, "routeTemplates"));
  if (snapshot.exists()) return; // already seeded, do nothing

  for (const template of templates) {
    await set(ref(db, `routeTemplates/${template.id}`), {
      name:          template.name,
      dayOfWeek:     template.dayOfWeek,
      source:        template.source,
      destination:   template.destination,
      departureTime: template.departureTime,
      arrivalTime:   template.arrivalTime,
      vehicle:       template.vehicle,
      driversNeeded: template.driversNeeded,
      createdAt:     Date.now(),
    });
  }
};

export default seedRouteTemplates;
