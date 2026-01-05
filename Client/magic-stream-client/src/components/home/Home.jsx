import {useState, useEffect, useCallback} from 'react';
import axiosClient from '../../api/axiosConfig'
import Movies from '../movies/Movies';
import Spinner from '../spinner/Spinner';
import SearchBar from '../searchBar/SearchBar';
import FilterBar from '../filterBar/FilterBar';
import './Home.css';

const Home =({updateMovieReview}) => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState();
    
    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [selectedGenreId, setSelectedGenreId] = useState(null);
    const [sortValue, setSortValue] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Debounce search query (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1); // Reset to first page on search change
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch movies with filters
    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            setMessage("");
            try{
                const params = {};
                
                // Only add params if they have values (for backward compatibility)
                if (debouncedSearchQuery) params.q = debouncedSearchQuery;
                if (selectedGenreId) params.genre_id = selectedGenreId;
                if (sortValue) params.sort = sortValue;
                
                // If no filters/search applied, fetch all movies; otherwise use pagination
                const hasFilters = debouncedSearchQuery || selectedGenreId || sortValue;
                if (hasFilters) {
                params.limit = 20;
                params.page = page;
                } else {
                    params.limit = "all"; // Fetch all movies when no filters
                    params.page = 1; // Always page 1 when showing all
                }

                const response = await axiosClient.get('/movies', { params });
                
                // Handle both old format (array) and new format (paginated object)
                let moviesData, totalCount, totalPagesCount;
                if (Array.isArray(response.data)) {
                    // Backward compatibility: old format
                    moviesData = response.data;
                    totalCount = response.data.length;
                    totalPagesCount = 1;
                } else {
                    // New paginated format
                    moviesData = response.data.items || [];
                    totalCount = response.data.total || 0;
                    totalPagesCount = response.data.totalPages || 1;
                }

                setMovies(moviesData);
                setTotal(totalCount);
                setTotalPages(totalPagesCount);

                if (moviesData.length === 0){
                    setMessage('No movies found matching your criteria');
                }

            }catch(error){
                console.error('Error fetching movies:', error);
                setMessage("Error fetching movies");
                setMovies([]);
            }finally{
                setLoading(false);
            }
        };
        fetchMovies();
    }, [debouncedSearchQuery, selectedGenreId, sortValue, page]);

    const handleClearAll = useCallback(() => {
        setSearchQuery('');
        setSelectedGenreId(null);
        setSortValue('');
        setPage(1);
    }, []);

    const handleGenreChange = useCallback((genreId) => {
        setSelectedGenreId(genreId);
        setPage(1); // Reset to first page
    }, []);

    const handleSortChange = useCallback((sort) => {
        setSortValue(sort);
        setPage(1); // Reset to first page
    }, []);

    return (
        <>
            <div className="catalog-controls">
                <SearchBar 
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search movies by title..."
                />
                <FilterBar
                    selectedGenreId={selectedGenreId}
                    onGenreChange={handleGenreChange}
                    sortValue={sortValue}
                    onSortChange={handleSortChange}
                    onClearAll={handleClearAll}
                />
            </div>

            {loading ? (
                <Spinner/>
            ) : (
                <>
                    <Movies 
                        movies={movies} 
                        updateMovieReview={updateMovieReview} 
                        message={message}
                        total={total}
                    />
                    
                    {/* Pagination - only show when filters/search are applied */}
                    {totalPages > 1 && (debouncedSearchQuery || selectedGenreId || sortValue) && (
                        <div className="pagination-container">
                            <div className="pagination-info">
                                Showing page {page} of {totalPages} ({total} total)
                            </div>
                            <div className="pagination-buttons">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    Previous
                                </button>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default Home;



