"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L, { LeafletMouseEvent } from "leaflet";
import styles from "./LocationCreationForm.module.css";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  type: z.enum(["bank", "hospital", "atm", "government", "fuel_station", "other"]),
  address: z.string().min(5, "Address is required."),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

type FormValues = z.infer<typeof formSchema>;

type GeocodeCandidate = {
  label: string;
  latitude: number;
  longitude: number;
};

const draggableIcon = L.divIcon({
  className: "qyou-map-pin",
  html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function RecenterOnCoordinate({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), {
      animate: true,
    });
  }, [latitude, longitude, map]);
  return null;
}

export default function LocationCreationForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeCandidate[]>([]);
  const [submitPayload, setSubmitPayload] = useState<string>("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "bank",
      address: "",
      latitude: 6.5244,
      longitude: 3.3792,
    },
  });

  const latitude = watch("latitude");
  const longitude = watch("longitude");

  const mapCenter = useMemo<[number, number]>(() => {
    return [latitude || 6.5244, longitude || 3.3792];
  }, [latitude, longitude]);

  const searchAddress = async () => {
    if (query.trim().length < 3) {
      setGeocodeResults([]);
      return;
    }

    setGeocodeLoading(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const payload = (await response.json()) as {
        success: boolean;
        data?: GeocodeCandidate[];
      };
      setGeocodeResults(payload.data || []);
    } catch {
      setGeocodeResults([]);
    } finally {
      setGeocodeLoading(false);
    }
  };

  const applyCandidate = (candidate: GeocodeCandidate) => {
    setValue("latitude", candidate.latitude, { shouldValidate: true, shouldDirty: true });
    setValue("longitude", candidate.longitude, { shouldValidate: true, shouldDirty: true });
    setValue("address", candidate.label, { shouldValidate: true, shouldDirty: true });
    setGeocodeResults([]);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");
    setSubmitSuccess("");
    const payload = {
      ...values,
      location: {
        type: "Point",
        coordinates: [values.longitude, values.latitude],
      },
    };

    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: {
          message?: string;
        };
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Unable to save location.");
      }

      setSubmitPayload(JSON.stringify(payload, null, 2));
      setSubmitSuccess("Location created successfully.");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save location.");
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Location</h1>
        <p className={styles.subtitle}>
          Search an address, then fine-tune the exact queue entry point by dragging the pin.
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.grid}>
            <div className={styles.col}>
              <div>
                <label className={styles.label}>Location Name</label>
                <input className={styles.input} placeholder="Lekki General Hospital" {...register("name")} />
                {errors.name && <p className={styles.error}>{errors.name.message}</p>}
              </div>

              <div>
                <label className={styles.label}>Type</label>
                <select className={styles.select} {...register("type")}>
                  <option value="bank">Bank</option>
                  <option value="hospital">Hospital</option>
                  <option value="atm">ATM</option>
                  <option value="government">Government</option>
                  <option value="fuel_station">Fuel Station</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={styles.label}>Address Search</label>
                <div className={styles.searchRow}>
                  <input
                    className={styles.input}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by address or building name"
                  />
                  <button type="button" className={styles.button} onClick={() => void searchAddress()} disabled={geocodeLoading}>
                    {geocodeLoading ? "Searching..." : "Geocode"}
                  </button>
                </div>
              </div>

              {geocodeResults.length > 0 && (
                <ul className={styles.suggestions}>
                  {geocodeResults.map((candidate) => (
                    <li className={styles.suggestionItem} key={`${candidate.latitude}:${candidate.longitude}:${candidate.label}`}>
                      <button type="button" className={styles.suggestionButton} onClick={() => applyCandidate(candidate)}>
                        {candidate.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <label className={styles.label}>Address</label>
                <input className={styles.input} placeholder="Auto-filled from geocoder" {...register("address")} />
                {errors.address && <p className={styles.error}>{errors.address.message}</p>}
              </div>

              <div className={styles.searchRow}>
                <div style={{ flex: 1 }}>
                  <label className={styles.label}>Latitude</label>
                  <input className={styles.input} type="number" step="0.000001" {...register("latitude")} />
                  {errors.latitude && <p className={styles.error}>{errors.latitude.message}</p>}
                </div>
                <div style={{ flex: 1 }}>
                  <label className={styles.label}>Longitude</label>
                  <input className={styles.input} type="number" step="0.000001" {...register("longitude")} />
                  {errors.longitude && <p className={styles.error}>{errors.longitude.message}</p>}
                </div>
              </div>
            </div>

            <div className={styles.col}>
              <label className={styles.label}>Mini Map (Drag Pin)</label>
              <div className={styles.mapWrap}>
                <MapContainer center={mapCenter} zoom={16} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterOnCoordinate latitude={latitude} longitude={longitude} />
                  <Marker
                    draggable
                    position={[latitude, longitude]}
                    icon={draggableIcon}
                    eventHandlers={{
                      dragend: (event) => {
                        const marker = event.target;
                        const next = marker.getLatLng();
                        setValue("latitude", Number(next.lat.toFixed(6)), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setValue("longitude", Number(next.lng.toFixed(6)), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      },
                      click: (event: LeafletMouseEvent) => {
                        const next = event.latlng;
                        setValue("latitude", Number(next.lat.toFixed(6)), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        setValue("longitude", Number(next.lng.toFixed(6)), {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      },
                    }}
                  />
                </MapContainer>
              </div>
              <p className={styles.mapHint}>
                Tip: drag the pin to the exact entrance users should queue at.
              </p>
            </div>
          </div>

          <button className={styles.submit} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Location"}
          </button>
        </form>

        {submitError ? <p className={styles.error}>{submitError}</p> : null}
        {submitSuccess ? <p className={styles.mapHint}>{submitSuccess}</p> : null}
        {submitPayload && <pre className={styles.result}>{submitPayload}</pre>}
      </div>
    </div>
  );
}
