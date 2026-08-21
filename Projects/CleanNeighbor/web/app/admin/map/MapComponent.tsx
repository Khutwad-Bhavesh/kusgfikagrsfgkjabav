"use client";

import React, { useEffect, useRef } from 'react';

// Import Leaflet's CSS for proper styling
import 'leaflet/dist/leaflet.css';

// Define the data structure for a single issue
interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  location: {
    address: string;
    city: string;
    district: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  reporter?: {
    firstName: string;
    lastName: string;
  };
}

// Define the props for the MapComponent
interface MapComponentProps {
  issues: Issue[];
}

const MapComponent: React.FC<MapComponentProps> = ({ issues }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null); // To hold the Leaflet map instance
  const markersRef = useRef<any[]>([]); // To hold the markers

  useEffect(() => {
    // We only want to run this code on the client side
    if (typeof window === 'undefined') return;

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet to ensure it's only loaded on the client
        const L = (await import('leaflet')).default;
        
        // This is a common workaround for icon path issues with bundlers like Webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        if (!mapRef.current) return;

        // If a map instance already exists, remove it before creating a new one
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Initialize the map, initially centered on a fallback location (Jharkhand)
        const map = L.map(mapRef.current).setView([23.63, 85.35], 7);
        
        // Try to get user's current location and center the map
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              
              // Only set view to current location if we don't have issues to fit bounds to
              // OR if this is the initial load (before bounds are fitted)
              map.setView([latitude, longitude], 12);
              
              // Add a marker for the user's current location
              L.circleMarker([latitude, longitude], {
                radius: 8,
                fillColor: '#3b82f6', // Blue for user location
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
              }).bindPopup('<div style="text-align: center; font-weight: bold;">Your Current Location</div>').addTo(map);
            },
            (error) => {
              console.warn("Geolocation error:", error);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }

        // Add the OpenStreetMap tile layer for the map background
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Clear any markers from a previous render
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Loop through each issue and add a marker to the map
        issues.forEach((issue) => {
          if (!issue.location.coordinates) return;

          // Helper function to determine marker color based on issue status
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'pending': return '#eab308'; // yellow
              case 'acknowledged': return '#3b82f6'; // blue
              case 'in_progress': return '#8b5cf6'; // purple
              case 'resolved': return '#22c55e'; // green
              case 'rejected': return '#ef4444'; // red
              default: return '#6b7280'; // gray
            }
          };

          // Create a custom circle marker
          const marker = L.circleMarker([issue.location.coordinates.lat, issue.location.coordinates.lng], {
            radius: 8,
            fillColor: getStatusColor(issue.status),
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(map);

          // Create the HTML content for the popup window
          const popupContent = `
            <div style="padding: 8px; min-width: 250px; font-family: sans-serif;">
              <h3 style="font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">${issue.title}</h3>
              <div style="margin-bottom: 8px;">
                <span style="background-color: ${getStatusColor(issue.status)}20; color: ${getStatusColor(issue.status)}; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize;">${issue.status.replace('_', ' ')}</span>
                <span style="background-color: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 4px; text-transform: capitalize;">${issue.priority}</span>
              </div>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Category:</strong> ${issue.category}</p>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Location:</strong> ${issue.location.address}</p>
              <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Reporter:</strong> ${issue.reporter?.firstName || ''} ${issue.reporter?.lastName || ''}</p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">${issue.description.substring(0, 100)}${issue.description.length > 100 ? '...' : ''}</p>
              <a href="/admin/waste-reports/${issue._id}" style="display: inline-block; background-color: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">View Details</a>
            </div>
          `;

          marker.bindPopup(popupContent);
          markersRef.current.push(marker);
        });

        // If there are issues, automatically adjust the map view to show all markers
        if (issues.length > 0 && markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.1));
        }

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    // Cleanup function: remove the map instance when the component unmounts
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [issues]); // Re-run the effect if the 'issues' prop changes

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[600px] rounded-lg"
      style={{ zIndex: 1, backgroundColor: '#e5e7eb' }} // Added a background color for a better loading state
    />
  );
};

export default MapComponent;