'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdresseAG, AdresseAutocompleteSuggestion, GoogleMapsAutocompleteStatus } from '../domain/types';

interface UseGoogleMapsAutocompleteProps {
  onPlaceSelect: (adresse: AdresseAG, nomLieu?: string) => void;
}

interface AdresseFeatureProperties {
  id?: string;
  label?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
}

interface AdresseFeature {
  properties?: AdresseFeatureProperties;
}

interface AdresseApiResponse {
  features?: AdresseFeature[];
}

const AUTOCOMPLETE_MIN_CHARS = 3;
const AUTOCOMPLETE_LIMIT = 6;

function isAdresseApiResponse(value: unknown): value is AdresseApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const maybe = value as { features?: unknown };
  return maybe.features === undefined || Array.isArray(maybe.features);
}

function buildAdresseFromProperties(properties: AdresseFeatureProperties): AdresseAG {
  const streetParts = [properties.housenumber, properties.street].filter(Boolean);
  return {
    nomLieu: properties.name || '',
    rue: streetParts.join(' ').trim(),
    codePostal: properties.postcode || '',
    ville: properties.city || '',
  };
}

function toSuggestion(feature: AdresseFeature, index: number): AdresseAutocompleteSuggestion | null {
  const properties = feature.properties;
  if (!properties || !properties.label) {
    return null;
  }

  return {
    id: properties.id || `${properties.label}-${index}`,
    label: properties.label,
    nomLieu: properties.name || '',
    adresse: buildAdresseFromProperties(properties),
  };
}

export function useGoogleMapsAutocomplete({
  onPlaceSelect,
}: UseGoogleMapsAutocompleteProps) {
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<AdresseAutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [status, setStatus] = useState<GoogleMapsAutocompleteStatus>('ready');

  useEffect(() => {
    const query = searchValue.trim();

    if (query.length < AUTOCOMPLETE_MIN_CHARS) {
      setSuggestions([]);
      setIsSearching(false);
      setStatus('ready');
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);

        const response = await fetch(
          `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&autocomplete=1&limit=${AUTOCOMPLETE_LIMIT}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json: unknown = await response.json();
        if (!isAdresseApiResponse(json)) {
          throw new Error('Réponse API invalide');
        }

        const nextSuggestions = (json.features || [])
          .map(toSuggestion)
          .filter((item): item is AdresseAutocompleteSuggestion => item !== null);

        setSuggestions(nextSuggestions);
        setStatus('ready');
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setSuggestions([]);
        setStatus('loading_error');
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [searchValue]);

  const selectSuggestion = useCallback((suggestion: AdresseAutocompleteSuggestion) => {
    setSearchValue(suggestion.label);
    setSuggestions([]);
    onPlaceSelect(suggestion.adresse, suggestion.nomLieu);
  }, [onPlaceSelect]);

  const isGoogleMapsLoaded = useMemo(() => status === 'ready', [status]);

  return {
    searchValue,
    suggestions,
    isSearching,
    setSearchValue,
    selectSuggestion,
    isGoogleMapsLoaded,
    googleMapsStatus: status,
  };
}
