import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const fieldRef = useRef(null);
  const listRef = useRef(null);
  // Where the suggestions list sits on screen. It is drawn on the page itself, not
  // inside the field, so the scroll area of an edit box or window can't clip it.
  const [listPos, setListPos] = useState(null);
  // Session-level cache: survives across form opens, dies on page reload.
  // Prevents repeat autocomplete API calls for the same input text.
  const sessionCache = useRef(new Map());

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

    const trimmed = text.trim();

    // Check session cache first — avoids API call entirely for repeat searches
    const cached = sessionCache.current.get(trimmed.toLowerCase());
    if (cached) {
      setSuggestions(cached);
      setShowSuggestions(cached.length > 0);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const response = await geocodeAddress({ action: 'autocomplete', input: text });
      const data = response.data || response;
      const list = data.suggestions || [];
      // Store in session cache
      sessionCache.current.set(trimmed.toLowerCase(), list);
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

  // Debounced search handler — 500ms prevents rapid-fire API calls while typing
  const handleSearchChange = (text) => {
    setSearchText(text);
    setError(null);
    setShowSuggestions(true);

    if (suggestionsTimeout.current) {
      clearTimeout(suggestionsTimeout.current);
    }

    suggestionsTimeout.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 500);
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
      const insideField = inputRef.current && inputRef.current.contains(event.target);
      const insideList = listRef.current && listRef.current.contains(event.target);
      if (!insideField && !insideList) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const listOpen = showSuggestions && (suggestions.length > 0 || isLoadingSuggestions);

  // Keep the list under the field while it is open, following scrolling and resizing.
  // It opens upwards when there isn't room below.
  useLayoutEffect(() => {
    if (!listOpen) { setListPos(null); return undefined; }
    const place = () => {
      const el = fieldRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const up = below < 260 && r.top > below;
      setListPos({
        left: r.left,
        width: r.width,
        top: up ? undefined : r.bottom + 8,
        bottom: up ? window.innerHeight - r.top + 8 : undefined,
        maxHeight: Math.max(120, Math.min(240, (up ? r.top : below) - 16)),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [listOpen, suggestions.length]);

  return (
    <div className="relative" ref={inputRef}>
      <div className={`flex gap-2 ${className}`}>
        <div className="flex-1 relative" ref={fieldRef}>
          <Input
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isGeocoding}
            className="pr-8 bg-[hsl(var(--background))] focus:!ring-0 focus:!border-transparent focus:!shadow-none border-transparent shadow-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0) {
                  handleSelectSuggestion(suggestions[0]);
                } else {
                  handleManualGeocode();
                }
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }} />

          {searchText && !disabled &&
          <button aria-label="Close"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            style={{ zIndex: 10 }}
            type="button">
              <X className="w-4 h-4" />
            </button>
          }

          {/* Suggestions Dropdown */}
          {listOpen && listPos && createPortal(
          <div
            ref={listRef}
            data-keep-window-open=""
            // Above windows (10004) and menus (10010), so it shows in any edit box.
            // pointer-events-auto: a modal window turns them off on the rest of the page.
            className="fixed bg-card border border-border rounded-lg shadow-lg overflow-y-auto pointer-events-auto"
            style={{ zIndex: 10015, left: listPos.left, width: listPos.width, top: listPos.top, bottom: listPos.bottom, maxHeight: listPos.maxHeight }}
            onMouseDown={(e) => e.preventDefault()}>

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
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-b-0 first:rounded-t-lg last:rounded-b-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{suggestion.description}</p>
                    </div>
                  </div>
                </button>
            )}
            </div>,
          document.body)
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
      <div className="mt-2 p-2 glass-inset rounded-lg border border-warning border-opacity-30 text-warning-fg text-xs flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      }
    </div>);

}