import { useState } from 'react';
import {
  AppSettings,
  Hobby,
  AI_HELP_OPTIONS,
  COMPANY_STAGE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  ENERGY_LEVEL_OPTIONS,
  HOBBY_FREQUENCY_OPTIONS,
  BODY_FAT_METHOD_OPTIONS,
  COUNTRIES,
} from './types';
import { WORLD_CITIES } from './cities';

const FOUNDER_KEYWORDS = ['founder', 'ceo', 'cofounder', 'co-founder', 'owner', 'entrepreneur', 'cto', 'coo'];

function isFounderRole(role: string): boolean {
  const lower = role.toLowerCase();
  return FOUNDER_KEYWORDS.some(keyword => lower.includes(keyword));
}


function calculateAge(month: string, day: string, year: string): number | null {
  if (!month || !day || !year) return null;
  const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => {
  const year = currentYear - i;
  return { value: String(year), label: String(year) };
});

interface Props {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSortCompletedToBottom: () => void;
  onBack: () => void;
}

export function SettingsPage({ settings, onSettingsChange, onSortCompletedToBottom, onBack }: Props) {
  const [showSortWarning, setShowSortWarning] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newHobbyName, setNewHobbyName] = useState('');
  const [newHobbyFrequency, setNewHobbyFrequency] = useState('');
  const [citySearch, setCitySearch] = useState(settings.location || '');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Filter cities based on search
  const locationResults = citySearch
    ? WORLD_CITIES.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
      ).slice(0, 8)
    : WORLD_CITIES.slice(0, 8);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ ...settings, anthropicApiKey: e.target.value });
  };

  const handleNumberInput = (field: 'heightFeet' | 'heightInches' | 'heightCm' | 'weightValue' | 'bodyFatPercentage', value: string) => {
    // Allow only numbers and decimal point for body fat percentage
    const cleanValue = field === 'bodyFatPercentage'
      ? value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') // Allow one decimal point
      : value.replace(/[^0-9]/g, '');
    onSettingsChange({ ...settings, [field]: cleanValue });
  };

  const handleHeightUnitChange = (newUnit: 'ft' | 'cm' | '') => {
    if (newUnit === 'cm' && settings.heightUnit === 'ft') {
      // Convert ft/in to cm
      const feet = parseInt(settings.heightFeet) || 0;
      const inches = parseInt(settings.heightInches) || 0;
      const totalInches = feet * 12 + inches;
      const cm = Math.round(totalInches * 2.54);
      onSettingsChange({
        ...settings,
        heightUnit: newUnit,
        heightCm: cm > 0 ? String(cm) : '',
      });
    } else if (newUnit === 'ft' && settings.heightUnit === 'cm') {
      // Convert cm to ft/in
      const cm = parseInt(settings.heightCm) || 0;
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      onSettingsChange({
        ...settings,
        heightUnit: newUnit,
        heightFeet: feet > 0 ? String(feet) : '',
        heightInches: inches > 0 ? String(inches) : '',
      });
    } else {
      onSettingsChange({ ...settings, heightUnit: newUnit });
    }
  };

  const handleWeightUnitChange = (newUnit: 'lbs' | 'kg' | '') => {
    if (newUnit === 'kg' && settings.weightUnit === 'lbs') {
      // Convert lbs to kg
      const lbs = parseInt(settings.weightValue) || 0;
      const kg = Math.round(lbs * 0.453592);
      onSettingsChange({
        ...settings,
        weightUnit: newUnit,
        weightValue: kg > 0 ? String(kg) : '',
      });
    } else if (newUnit === 'lbs' && settings.weightUnit === 'kg') {
      // Convert kg to lbs
      const kg = parseInt(settings.weightValue) || 0;
      const lbs = Math.round(kg * 2.20462);
      onSettingsChange({
        ...settings,
        weightUnit: newUnit,
        weightValue: lbs > 0 ? String(lbs) : '',
      });
    } else {
      onSettingsChange({ ...settings, weightUnit: newUnit });
    }
  };

  const addHobby = () => {
    if (!newHobbyName.trim() || !newHobbyFrequency) return;
    const newHobby: Hobby = { name: newHobbyName.trim(), frequency: newHobbyFrequency };
    onSettingsChange({ ...settings, hobbies: [...(settings.hobbies || []), newHobby] });
    setNewHobbyName('');
    setNewHobbyFrequency('');
  };

  const removeHobby = (index: number) => {
    const newHobbies = [...(settings.hobbies || [])];
    newHobbies.splice(index, 1);
    onSettingsChange({ ...settings, hobbies: newHobbies });
  };

  const age = calculateAge(settings.birthMonth, settings.birthDay, settings.birthYear);

  const handleAutoSortToggle = () => {
    if (!settings.autoSortCompletedTodos) {
      // Enabling - show warning first
      setShowSortWarning(true);
    } else {
      // Disabling - no warning needed
      onSettingsChange({ ...settings, autoSortCompletedTodos: false });
    }
  };

  const confirmSort = () => {
    onSettingsChange({ ...settings, autoSortCompletedTodos: true });
    onSortCompletedToBottom();
    setShowSortWarning(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Settings</h1>
      </div>

      <div className="settings-sections">
        <div className="settings-section about-section">
          <h2>About</h2>
          <p className="mission-statement">
            Life is short. Spend it on what matters.
          </p>
          <p className="about-description">
            Modern life throws too much at you. Command Center cuts through the noise —
            one place to see everything, act on what matters, and let AI handle the rest.
          </p>
          <p className="about-description">
            Track the things that shape you — habits, goals, relationships, health.
            See patterns. Make changes. Compound over time.
          </p>
          <p className="about-description last">
            Close the gap between who you are and who you want to be.
          </p>

          <div className="about-goals">
            <h3>Goals</h3>
            <ul>
              <li>
                <strong>Optimize your time</strong> — Understand how you're spending your time, identify what to delegate or automate, and create AI agents to handle the rest.
              </li>
              <li>
                <strong>Stay on track</strong> — Keep your goals, routines, and daily tasks visible and accountable. Build momentum through consistency.
              </li>
              <li>
                <strong>Give AI full context</strong> — Most AI interactions fail because context is missing. Command Center gives AI everything it needs: your relationships, health, finances, goals, tasks, and who you are.
              </li>
            </ul>
          </div>
        </div>

        <div className="settings-section">
          <h2>AI Assistant</h2>
          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Anthropic API Key</span>
              <span className="settings-description">
                Required for AI features. Get your key at{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                  console.anthropic.com
                </a>
              </span>
            </label>
            <div className="api-key-input-wrapper">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.anthropicApiKey}
                onChange={handleApiKeyChange}
                placeholder="sk-ant-..."
                className="settings-text-input"
              />
              <button
                type="button"
                className="show-key-btn"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {settings.anthropicApiKey && (
              <span className="api-key-status connected">Connected</span>
            )}
          </div>

          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">What I want from AI</span>
              <span className="settings-description">
                Select all that apply
              </span>
            </label>
            <div className="settings-checkbox-group">
              {AI_HELP_OPTIONS.map((option) => (
                <label key={option.value} className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.aiHelpPreferences.includes(option.value)}
                    onChange={(e) => {
                      const newPrefs = e.target.checked
                        ? [...settings.aiHelpPreferences, option.value]
                        : settings.aiHelpPreferences.filter((p) => p !== option.value);
                      onSettingsChange({ ...settings, aiHelpPreferences: newPrefs });
                    }}
                  />
                  <span className="checkbox-mark"></span>
                  {option.label}
                </label>
              ))}
            </div>
          </div>

        </div>

        <div className="settings-section">
          <h2>Personal Info</h2>
          <span className="settings-section-description">
            Optional — helps the AI customize suggestions for you
          </span>

          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Your Role</span>
            </label>
            <input
              type="text"
              value={settings.userRole}
              onChange={(e) => onSettingsChange({ ...settings, userRole: e.target.value })}
              placeholder="e.g., CEO, Engineer, Student..."
              className="settings-text-input"
            />
          </div>

          {isFounderRole(settings.userRole) && (
            <div className="settings-row">
              <div className="settings-input-group">
                <label className="settings-input-label">
                  <span className="settings-title">Annual Gross Revenue</span>
                </label>
                <select
                  value={settings.companyStage}
                  onChange={(e) => onSettingsChange({ ...settings, companyStage: e.target.value })}
                  className="settings-select"
                >
                  <option value="">Select...</option>
                  {COMPANY_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-input-group">
                <label className="settings-input-label">
                  <span className="settings-title">Team Size</span>
                </label>
                <select
                  value={settings.teamSize}
                  onChange={(e) => onSettingsChange({ ...settings, teamSize: e.target.value })}
                  className="settings-select"
                >
                  <option value="">Select...</option>
                  {TEAM_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Location</span>
              <span className="settings-description">
                Search or type your city
              </span>
            </label>
            <div className="city-search-wrapper">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setCitySearch(value);
                  setShowCityDropdown(true);

                  // Check if this matches a known city
                  const isKnownCity = WORLD_CITIES.some(
                    city => city.toLowerCase() === value.toLowerCase()
                  );

                  if (isKnownCity) {
                    // Use the known city directly
                    onSettingsChange({
                      ...settings,
                      location: value,
                      customCity: '',
                      customCountry: ''
                    });
                  } else {
                    // Custom city - save separately, combine with country
                    const country = settings.customCountry;
                    const location = country ? `${value}, ${country}` : value;
                    onSettingsChange({
                      ...settings,
                      location,
                      customCity: value
                    });
                  }
                }}
                onFocus={() => setShowCityDropdown(true)}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                placeholder="e.g., San Francisco, CA, USA"
                className="settings-text-input"
              />
              {showCityDropdown && citySearch && locationResults.length > 0 && (
                <div className="city-dropdown">
                  {locationResults.map((city) => (
                    <div
                      key={city}
                      className="city-option"
                      onMouseDown={() => {
                        setCitySearch(city);
                        onSettingsChange({
                          ...settings,
                          location: city,
                          customCity: '',
                          customCountry: ''
                        });
                        setShowCityDropdown(false);
                      }}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Show country dropdown for custom cities */}
            {citySearch && !WORLD_CITIES.some(city => city.toLowerCase() === citySearch.toLowerCase()) && (
              <div className="custom-country-row">
                <select
                  value={settings.customCountry}
                  onChange={(e) => {
                    const country = e.target.value;
                    const location = country ? `${settings.customCity}, ${country}` : settings.customCity;
                    onSettingsChange({
                      ...settings,
                      customCountry: country,
                      location
                    });
                  }}
                  className="settings-select"
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Birthdate</span>
              <span className="settings-description">
                Age auto-updates{age !== null && ` — currently ${age}`}
              </span>
            </label>
            <div className="birthdate-row">
              <select
                value={settings.birthMonth}
                onChange={(e) => onSettingsChange({ ...settings, birthMonth: e.target.value })}
                className="settings-select"
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={settings.birthDay}
                onChange={(e) => onSettingsChange({ ...settings, birthDay: e.target.value })}
                className="settings-select settings-select-small"
              >
                <option value="">Day</option>
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <select
                value={settings.birthYear}
                onChange={(e) => onSettingsChange({ ...settings, birthYear: e.target.value })}
                className="settings-select"
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Energy Level</span>
              <span className="settings-description">
                Helps calibrate expectations and suggestions
              </span>
            </label>
            <select
              value={settings.energyLevel}
              onChange={(e) => onSettingsChange({ ...settings, energyLevel: e.target.value })}
              className="settings-select"
            >
              <option value="">Select...</option>
              {ENERGY_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-row">
            <div className="settings-input-group">
              <label className="settings-input-label">
                <span className="settings-title">Height</span>
              </label>
              <div className="settings-unit-input">
                <select
                  value={settings.heightUnit}
                  onChange={(e) => handleHeightUnitChange(e.target.value as 'ft' | 'cm' | '')}
                  className="settings-select settings-select-small"
                >
                  <option value="">Unit</option>
                  <option value="ft">ft/in</option>
                  <option value="cm">cm</option>
                </select>
                {settings.heightUnit === 'ft' ? (
                  <>
                    <input
                      type="text"
                      value={settings.heightFeet}
                      onChange={(e) => handleNumberInput('heightFeet', e.target.value)}
                      placeholder="ft"
                      className="settings-text-input settings-input-tiny"
                      maxLength={1}
                    />
                    <span className="unit-label">ft</span>
                    <input
                      type="text"
                      value={settings.heightInches}
                      onChange={(e) => handleNumberInput('heightInches', e.target.value)}
                      placeholder="in"
                      className="settings-text-input settings-input-tiny"
                      maxLength={2}
                    />
                    <span className="unit-label">in</span>
                  </>
                ) : settings.heightUnit === 'cm' ? (
                  <input
                    type="text"
                    value={settings.heightCm}
                    onChange={(e) => handleNumberInput('heightCm', e.target.value)}
                    placeholder="178"
                    className="settings-text-input settings-input-small"
                  />
                ) : null}
              </div>
            </div>

            <div className="settings-input-group">
              <label className="settings-input-label">
                <span className="settings-title">Weight</span>
              </label>
              <div className="settings-unit-input">
                <select
                  value={settings.weightUnit}
                  onChange={(e) => handleWeightUnitChange(e.target.value as 'lbs' | 'kg' | '')}
                  className="settings-select settings-select-small"
                >
                  <option value="">Unit</option>
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
                {settings.weightUnit && (
                  <input
                    type="text"
                    value={settings.weightValue}
                    onChange={(e) => handleNumberInput('weightValue', e.target.value)}
                    placeholder={settings.weightUnit === 'kg' ? '75' : '165'}
                    className="settings-text-input settings-input-small"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-input-group">
              <label className="settings-input-label">
                <span className="settings-title">Body Fat %</span>
              </label>
              <input
                type="text"
                value={settings.bodyFatPercentage}
                onChange={(e) => handleNumberInput('bodyFatPercentage', e.target.value)}
                placeholder="15.5"
                className="settings-text-input settings-input-small"
              />
            </div>

            <div className="settings-input-group">
              <label className="settings-input-label">
                <span className="settings-title">Method</span>
              </label>
              <select
                value={settings.bodyFatMethod}
                onChange={(e) => onSettingsChange({ ...settings, bodyFatMethod: e.target.value })}
                className="settings-select"
              >
                <option value="">Select...</option>
                {BODY_FAT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Hobbies</span>
              <span className="settings-description">
                Activities outside your tracked routines
              </span>
            </label>
            {(settings.hobbies || []).length > 0 && (
              <div className="hobbies-list">
                {(settings.hobbies || []).map((hobby, index) => (
                  <div key={index} className="hobby-item">
                    <span className="hobby-name">{hobby.name}</span>
                    <span className="hobby-frequency">
                      {HOBBY_FREQUENCY_OPTIONS.find(o => o.value === hobby.frequency)?.label || hobby.frequency}
                    </span>
                    <button
                      type="button"
                      className="hobby-remove"
                      onClick={() => removeHobby(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="hobby-add-row">
              <input
                type="text"
                value={newHobbyName}
                onChange={(e) => setNewHobbyName(e.target.value)}
                placeholder="Hobby name"
                className="settings-text-input"
                onKeyDown={(e) => e.key === 'Enter' && addHobby()}
              />
              <select
                value={newHobbyFrequency}
                onChange={(e) => setNewHobbyFrequency(e.target.value)}
                className="settings-select"
              >
                <option value="">Frequency</option>
                {HOBBY_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="hobby-add-btn"
                onClick={addHobby}
                disabled={!newHobbyName.trim() || !newHobbyFrequency}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Finances</h2>
          <div className="settings-input-group">
            <label className="settings-input-label">
              <span className="settings-title">Investment Portfolio Sheet</span>
              <span className="settings-description">
                Link to your Google Sheet (must be viewable to you). Note: AI cannot read this directly — paste relevant data into the Finances card when needed.
              </span>
            </label>
            <input
              type="url"
              value={settings.financeSheetUrl}
              onChange={(e) => onSettingsChange({ ...settings, financeSheetUrl: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="settings-text-input"
            />
            {settings.financeSheetUrl && (
              <a
                href={settings.financeSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="settings-link"
              >
                Open sheet →
              </a>
            )}
          </div>
        </div>

        <div className="settings-section">
          <h2>To-Dos</h2>

          <label className="settings-toggle">
            <span className="settings-label">
              <span className="settings-title">Move completed to bottom</span>
              <span className="settings-description">
                Automatically move checked-off todos to the bottom of their section
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.autoSortCompletedTodos}
              onChange={handleAutoSortToggle}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {showSortWarning && (
        <div className="settings-warning-overlay" onClick={() => setShowSortWarning(false)}>
          <div className="settings-warning-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Move completed todos to bottom?</h3>
            <p>This will reorder all your todos, moving completed items to the bottom of each section.</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="settings-warning-buttons">
              <button onClick={() => setShowSortWarning(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmSort}>Move to bottom</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
