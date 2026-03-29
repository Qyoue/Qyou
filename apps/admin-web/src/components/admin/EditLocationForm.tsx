"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./LocationCreationForm.module.css";

type LocationPayload = {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  coordinates: [number, number] | null;
} | null;

export default function EditLocationForm({ location }: { location: LocationPayload }) {
  const router = useRouter();
  const [name, setName] = useState(location?.name || "");
  const [type, setType] = useState(location?.type || "bank");
  const [status, setStatus] = useState(location?.status || "active");
  const [address, setAddress] = useState(location?.address || "");
  const [latitude, setLatitude] = useState(
    location?.coordinates ? String(location.coordinates[1]) : "6.5244"
  );
  const [longitude, setLongitude] = useState(
    location?.coordinates ? String(location.coordinates[0]) : "3.3792"
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!location) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Edit Location</h1>
          <p className={styles.error}>Location could not be loaded.</p>
          <Link href="/admin/locations">Back to locations</Link>
        </div>
      </div>
    );
  }

  const submit = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/locations/${location.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          type,
          status,
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Unable to update location.");
      }

      setMessage("Location updated successfully.");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update location.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Edit Location</h1>
        <p className={styles.subtitle}>Update coordinates, metadata, or deactivate this location.</p>

        <div className={styles.grid}>
          <div className={styles.col}>
            <label className={styles.label}>Name</label>
            <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} />
            <label className={styles.label}>Type</label>
            <select className={styles.select} value={type} onChange={(event) => setType(event.target.value)}>
              <option value="bank">Bank</option>
              <option value="hospital">Hospital</option>
              <option value="atm">ATM</option>
              <option value="government">Government</option>
              <option value="fuel_station">Fuel Station</option>
              <option value="other">Other</option>
            </select>
            <label className={styles.label}>Status</label>
            <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <label className={styles.label}>Address</label>
            <input className={styles.input} value={address} onChange={(event) => setAddress(event.target.value)} />
            <label className={styles.label}>Latitude</label>
            <input className={styles.input} value={latitude} onChange={(event) => setLatitude(event.target.value)} />
            <label className={styles.label}>Longitude</label>
            <input className={styles.input} value={longitude} onChange={(event) => setLongitude(event.target.value)} />
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.mapHint}>{message}</p> : null}
        <button className={styles.submit} type="button" onClick={() => void submit()} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

