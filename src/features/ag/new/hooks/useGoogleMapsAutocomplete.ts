'use client';

import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import type { GoogleAutocomplete, AdresseAG } from '../domain/types';

interface UseGoogleMapsAutocompleteProps {
  onPlaceSelect: (adresse: AdresseAG, nomLieu?: string) => void;
  formatAdresseComplete: (adresse: AdresseAG) => string;
}

export function useGoogleMapsAutocomplete({
  onPlaceSelect,
  formatAdresseComplete,
}: UseGoogleMapsAutocompleteProps) {
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<GoogleAutocomplete | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  // Load Google Maps
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    if (!isGoogleMapsLoaded || !autocompleteRef.current || !window.google) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'fr' },
      fields: ['formatted_address', 'address_components', 'geometry', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (place.address_components) {
        let rue = '';
        let numero = '';
        let codePostal = '';
        let ville = '';
        const nomLieu = place.name || '';

        for (const component of place.address_components) {
          const types = component.types;
          if (types.includes('street_number')) {
            numero = component.long_name;
          } else if (types.includes('route')) {
            rue = component.long_name;
          } else if (types.includes('postal_code')) {
            codePostal = component.long_name;
          } else if (types.includes('locality')) {
            ville = component.long_name;
          }
        }

        const nouvelleAdresse: AdresseAG = {
          nomLieu: nomLieu,
          rue: numero ? `${numero} ${rue}` : rue,
          codePostal: codePostal,
          ville: ville,
        };

        onPlaceSelect(nouvelleAdresse, nomLieu);
      }
    });

    autocompleteInstance.current = autocomplete;

    return () => {
      if (autocompleteInstance.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance.current);
      }
    };
  }, [isGoogleMapsLoaded, onPlaceSelect, formatAdresseComplete]);

  return {
    autocompleteRef,
    isGoogleMapsLoaded,
  };
}
