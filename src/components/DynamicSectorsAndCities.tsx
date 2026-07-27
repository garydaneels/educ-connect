"use client";
import { useState, useEffect } from "react";
import { PUBLIC_TYPES } from "@/lib/constants";

interface Province {
  id: string;
  name: string;
  cities: Array<{ id: string; name: string }>;
}

export function DynamicSectors() {
  const [sectors, setSectors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/config-items")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) {
          const pubTypes: Record<string, string> = {};
          data.items.forEach((item: any) => {
            if (item.category === "SECTOR") pubTypes[item.key] = item.label;
          });
          if (Object.keys(pubTypes).length > 0) {
            setSectors(pubTypes);
          }
        }
      })
      .catch(console.error);
  }, []);

  const displaySectors = Object.keys(sectors).length > 0 ? sectors : PUBLIC_TYPES;

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {[
        { emoji: "🧩", label: "Autisme (TSA)" },
        { emoji: "🧠", label: "Handicap mental (DI)" },
        { emoji: "♿", label: "Handicap moteur" },
        { emoji: "👁️", label: "Handicap sensoriel" },
        { emoji: "👶", label: "Aide à la jeunesse" },
        { emoji: "🏥", label: "Psychiatrie" },
        { emoji: "👴", label: "Seniors (Maison de repos et de soins)" },
      ].map((s) => (
        <span key={s.label} className="bg-white border border-orange-200 text-stone-700 px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <span>{s.emoji}</span> {s.label}
        </span>
      ))}
    </div>
  );
}

export function DynamicCities() {
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/provinces")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.provinces) {
          const allCities = new Set<string>();
          data.provinces.forEach((p: Province) => {
            p.cities.forEach(c => allCities.add(c.name));
          });
          setCities(Array.from(allCities).sort());
        }
      })
      .catch(console.error);
  }, []);

  const defaultCities = [
    "Anderlecht", "Auderghem", "Berchem-Sainte-Agathe", "Bruxelles (Ville)",
    "Etterbeek", "Evere", "Forest", "Ganshoren", "Ixelles", "Jette",
    "Koekelberg", "Molenbeek-Saint-Jean", "Saint-Gilles", "Saint-Josse-ten-Noode",
    "Schaerbeek", "Uccle", "Watermael-Boitsfort", "Woluwe-Saint-Lambert", "Woluwe-Saint-Pierre",
  ];

  const displayCities = cities.length > 0 ? cities : defaultCities;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {displayCities.map((c) => (
        <span key={c} className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs">
          {c}
        </span>
      ))}
    </div>
  );
}
