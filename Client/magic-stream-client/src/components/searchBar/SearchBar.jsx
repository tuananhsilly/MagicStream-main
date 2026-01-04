import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import './SearchBar.css';

const SearchBar = ({ value, onChange, placeholder = "Search movies..." }) => {
    const [localValue, setLocalValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleClear = () => {
        setLocalValue('');
        onChange('');
    };

    return (
        <div className="search-bar-container">
            <div className="search-bar-wrapper">
                <FontAwesomeIcon 
                    icon={faSearch} 
                    className={`search-icon ${isFocused ? 'focused' : ''}`} 
                />
                <input
                    type="text"
                    className="search-input"
                    placeholder={placeholder}
                    value={localValue}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {localValue && (
                    <button
                        type="button"
                        className="search-clear-btn"
                        onClick={handleClear}
                        aria-label="Clear search"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default SearchBar;

