import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader, Search, X } from 'lucide-react';
import { geocodeAddress } from '@/functions/geocodeAddress';

/**
 * AddressLookupInput — Google Places-powered address autocomplete.
 *
 * All address data across the app uses this component so the shape is always:
 * { address, display_name, latitude, longitude, address_line_1, address_line_2, town, county, postcode }
 *
 * @param {string}   props.value           - Current address display value
 * @param {function} props.onChange        - Callback with the full address data object
 * @param {string}   props.placeholder     - Input placeholder text
 * @param {boolean}  props.disabled        - Whether input is disabled
 * @param {string}   props.className       - Additional CSS classes
 * @param {boolean}  props.showSearchButton - Whether to show a manual "Find" button
 */
export default function AddressLookupInput({
  value = '',
  onChange,
  placeholder = 'Start typing address or postcode...',
  disabled = false,
  className = '',
  showSearchButton = false
}) {
  const [searchText, setSearchText] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState(null);
  const suggestionsTimeout = useRef(null);
  const inputRef = useRef(null);

  // Update internal state when external value changes
  useEffect(() => {
    setSearchText(value);
  }, [value]);

  // Fetch address suggestions from Google Places Autocomplete (via backend)
  const fetchSuggestions = async (text) => {
    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await geocodeAddress({ action: 'autocomplete', input: text });
      const data = response.data || response;
      const list = data.suggestions || [];
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    } catch (err) {
      console.error('Suggestions fetch failed:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (text) => {
    setSearchText(text);
    setError(null);
    setShowSuggestions(true);

    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }

    suggestionsTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  };

  // Handle suggestion selection — fetch full details from Google Place Details
  const handleSelectSuggestion = async (suggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setError(null);
    setIsGeocoding(true);

    try {
      const response = await geocodeAddress({ action: 'details', place_id: suggestion.place_id });
      const addressData = response.data || response;

      setSearchText(addressData.display_name || suggestion.description);

      if (onChange) {
        onChange(addressData);
      }
    } catch (err) {
      console.error('Place details error:', err);
      setError('Unable to retrieve address details. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Manual geocode — converts a typed address string to coordinates
  const handleManualGeocode = async () => {
    if (!searchText || searchText.trim().length < 3) {
      setError('Please enter a valid address or postcode');
      return;
    }

    setIsGeocoding(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await geocodeAddress({ action: 'geocode', address: searchText });
      const result = response.data || response;

      if (result && result.latitude && result.longitude) {
        setSearchText(result.display_name || searchText);
        setError(null);

        if (onChange) {
          onChange(result);
        }
      } else {
        setError('Address not found. Please try a different format.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Unable to locate address. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    setIsLoadingSuggestions(false);

    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }

    if (onChange) {
      onChange({
        address: '',
        display_name: '',
        latitude: null,
        longitude: null,
        address_line_1: '',
        address_line_2: '',
        town: '',
        county: '',
        postcode: ''
      });
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <div className={`flex gap-2 ${className}`}>
        <div className="flex-1 relative" style={{ zIndex: 1000 }}>
          <Input
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isGeocoding}
            className="pr-8 bg-[hsl(var(--background))]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !showSuggestions && showSearchButton) {
                e.preventDefault();
                handleManualGeocode();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }} />

          {searchText && !disabled &&
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            style={{ zIndex: 10 }}
            type="button">
              <X className="w-4 h-4" />
            </button>
          }

          {/* Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) &&
          <div
            className="absolute w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{ zIndex: 9999 }}>

              {isLoadingSuggestions &&
            <div className="p-3 text-center text-xs text-foreground-muted">
                  <Loader className="w-4 h-4 animate-spin inline mr-2" />
                  Searching...
                </div>
            }
              {suggestions.map((suggestion, index) =>
            <button
              key={suggestion.place_id || index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{suggestion.description}</p>
                    </div>
                  </div>
                </button>
            )}
            </div>
          }
        </div>

        {showSearchButton &&
        <Button
          type="button"
          onClick={handleManualGeocode}
          disabled={isGeocoding || !searchText || searchText.trim().length < 3}
          className="glass-button px-4 py-2 flex items-center gap-2 text-sm text-[hsl(var(--card))]">
            {isGeocoding ?
          <><Loader className="w-4 h-4 animate-spin" /> Locating...</> :
          <><Search className="w-4 h-4" /> Find</>
          }
          </Button>
        }
      </div>

      {error &&
      <div className="mt-2 p-2 glass-inset rounded-lg border border-orange-500 border-opacity-30 text-orange-600 text-xs flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      }
    </div>);

}