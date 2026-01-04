import { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import './FilterBar.css';

const FilterBar = ({ selectedGenreId, onGenreChange, sortValue, onSortChange, onClearAll }) => {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchGenres = async () => {
            setLoading(true);
            try {
                const response = await axiosClient.get('/genres');
                setGenres(response.data || []);
            } catch (error) {
                console.error('Error fetching genres:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGenres();
    }, []);

    const hasActiveFilters = selectedGenreId || sortValue !== '';

    return (
        <div className="filter-bar-container">
            <div className="filter-bar-header">
                <div className="filter-bar-title">
                    <FontAwesomeIcon icon={faFilter} className="filter-icon" />
                    <span>Filters</span>
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        className="clear-all-btn"
                        onClick={onClearAll}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                        Clear All
                    </button>
                )}
            </div>

            <div className="filter-bar-content">
                {/* Genre Filter */}
                <div className="filter-group">
                    <label className="filter-label">Genre</label>
                    {loading ? (
                        <div className="filter-loading">Loading genres...</div>
                    ) : (
                        <div className="genre-chips-container">
                            <button
                                type="button"
                                className={`genre-chip-filter ${!selectedGenreId ? 'selected' : ''}`}
                                onClick={() => onGenreChange(null)}
                            >
                                All
                            </button>
                            {genres.map((genre) => (
                                <button
                                    key={genre.genre_id}
                                    type="button"
                                    className={`genre-chip-filter ${selectedGenreId === genre.genre_id ? 'selected' : ''}`}
                                    onClick={() => onGenreChange(genre.genre_id)}
                                >
                                    {genre.genre_name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sort Dropdown */}
                <div className="filter-group">
                    <label className="filter-label" htmlFor="sort-select">
                        Sort By
                    </label>
                    <select
                        id="sort-select"
                        className="sort-select"
                        value={sortValue}
                        onChange={(e) => onSortChange(e.target.value)}
                    >
                        <option value="">Default</option>
                        <option value="top_ranked">Top Ranked</option>
                        <option value="az">A-Z</option>
                        <option value="za">Z-A</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;

