"use client";

import { useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import styles from "./SpatialVerificationMap.module.css";
import "leaflet/dist/leaflet.css";

type LocationPoint = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
};

type Props = {
  locations: LocationPoint[];
};

type ClusterNode = {
  id: string;
  center: [number, number];
  count: number;
  items: LocationPoint[];
};

const TYPES = ["all", "bank", "hospital", "atm", "government", "fuel_station", "other"] as const;

const toCellSize = (zoom: number) => {
  if (zoom >= 15) return { lat: 0.006, lng: 0.006 };
  if (zoom >= 13) return { lat: 0.012, lng: 0.012 };
  if (zoom >= 11) return { lat: 0.02, lng: 0.02 };
  if (zoom >= 9) return { lat: 0.04, lng: 0.04 };
  return { lat: 0.08, lng: 0.08 };
};

const getHeatColor = (count: number) => {
  if (count >= 20) return "#a50026";
  if (count >= 12) return "#d73027";
  if (count >= 8) return "#f46d43";
  if (count >= 4) return "#fdae61";
  return "#74add1";
};

function ZoomListener({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => {
      onZoom(event.target.getZoom());
    },
  });
  return null;
}

export default function SpatialVerificationMap({ locations }: Props) {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>("all");
  const [zoomLevel, setZoomLevel] = useState(11);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return locations.filter((location) => {
      if (!location.coordinates || location.coordinates.length !== 2) return false;
      if (typeFilter === "all") return true;
      return location.type === typeFilter;
    });
  }, [locations, typeFilter]);

  const clusters = useMemo<ClusterNode[]>(() => {
    const cell = toCellSize(zoomLevel);
    const grouped = new Map<string, LocationPoint[]>();

    for (const item of filtered) {
      if (!item.coordinates) continue;
      const lng = item.coordinates[0];
      const lat = item.coordinates[1];

      const x = Math.floor((lng + 180) / cell.lng);
      const y = Math.floor((lat + 90) / cell.lat);
      const key = `${x}:${y}`;

      const bucket = grouped.get(key);
      if (!bucket) {
        grouped.set(key, [item]);
      } else {
        bucket.push(item);
      }
    }

    return Array.from(grouped.entries()).map(([key, items]) => {
      const center = items.reduce(
        (acc, current) => {
          if (!current.coordinates) return acc;
          return {
            lng: acc.lng + current.coordinates[0],
            lat: acc.lat + current.coordinates[1],
          };
        },
        { lng: 0, lat: 0 }
      );

      return {
        id: key,
        center: [center.lat / items.length, center.lng / items.length],
        count: items.length,
        items,
      };
    });
  }, [filtered, zoomLevel]);

  const selectedCluster = useMemo(() => {
    if (!selectedClusterId) return null;
    return clusters.find((cluster) => cluster.id === selectedClusterId) || null;
  }, [clusters, selectedClusterId]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (clusters[0]) {
      return clusters[0].center;
    }
    return [6.5244, 3.3792];
  }, [clusters]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Spatial Verification Map</h1>
            <p className={styles.sub}>
              Heat-style density view for location coverage and sparse area analysis.
            </p>
          </div>
          <div className={styles.toolbar}>
            <label className={styles.label} htmlFor="type-filter">
              Type Filter
            </label>
            <select
              id="type-filter"
              className={styles.select}
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as (typeof TYPES)[number]);
                setSelectedClusterId(null);
              }}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All types" : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.mapPane}>
            <div className={styles.stats}>
              <div>Filtered points: {filtered.length}</div>
              <div>Visible zones: {clusters.length}</div>
              <div>Zoom: {zoomLevel}</div>
            </div>
            <MapContainer center={defaultCenter} zoom={zoomLevel} className={styles.map}>
              <ZoomListener onZoom={setZoomLevel} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {clusters.map((cluster) => (
                <CircleMarker
                  key={cluster.id}
                  center={cluster.center}
                  radius={Math.max(8, Math.min(26, 8 + Math.log2(cluster.count + 1) * 3))}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 1,
                    fillColor: getHeatColor(cluster.count),
                    fillOpacity: 0.66,
                  }}
                  eventHandlers={{
                    click: () => setSelectedClusterId(cluster.id),
                  }}
                >
                  <Popup>
                    <strong>{cluster.count}</strong> locations in this zone.
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <aside className={styles.side}>
            <h2 className={styles.zoneTitle}>
              {selectedCluster
                ? `Zone Details (${selectedCluster.count} locations)`
                : "Zone Details"}
            </h2>
            {!selectedCluster && (
              <p className={styles.hint}>
                Click a hot zone on the map to list all locations in that area.
              </p>
            )}
            {selectedCluster && (
              <ul className={styles.list}>
                {selectedCluster.items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <p className={styles.itemName}>{item.name}</p>
                    <p className={styles.itemMeta}>
                      {item.type} • {item.status}
                    </p>
                    <p className={styles.itemMeta}>{item.address}</p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
