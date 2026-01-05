import { createContext, useState, useEffect, useContext } from 'react';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import useAuth from '../hooks/useAuth';

const WatchlistContext = createContext({});

export const WatchlistProvider = ({ children }) => {
    const [watchlistIds, setWatchlistIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();

    // Fetch watchlist IDs when user is authenticated
    useEffect(() => {
        if (auth) {
            const fetchWatchlistIds = async () => {
                setLoading(true);
                try {
                    const response = await axiosPrivate.get('/mylist');
                    const movies = response.data || [];
                    const ids = new Set(movies.map(m => m.imdb_id));
                    setWatchlistIds(ids);
                } catch (err) {
                    console.error('Error fetching watchlist:', err);
                    setWatchlistIds(new Set());
                } finally {
                    setLoading(false);
                }
            };
            fetchWatchlistIds();
        } else {
            setWatchlistIds(new Set());
        }
    }, [auth, axiosPrivate]);

    const addToWatchlist = async (imdbId) => {
        try {
            await axiosPrivate.post(`/mylist/${imdbId}`);
            setWatchlistIds(prev => new Set([...prev, imdbId]));
            return true;
        } catch (err) {
            console.error('Error adding to watchlist:', err);
            return false;
        }
    };

    const removeFromWatchlist = async (imdbId) => {
        try {
            await axiosPrivate.delete(`/mylist/${imdbId}`);
            setWatchlistIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(imdbId);
                return newSet;
            });
            return true;
        } catch (err) {
            console.error('Error removing from watchlist:', err);
            return false;
        }
    };

    const toggleWatchlist = async (imdbId) => {
        if (watchlistIds.has(imdbId)) {
            return await removeFromWatchlist(imdbId);
        } else {
            return await addToWatchlist(imdbId);
        }
    };

    const isInWatchlist = (imdbId) => {
        return watchlistIds.has(imdbId);
    };

    return (
        <WatchlistContext.Provider
            value={{
                watchlistIds,
                loading,
                addToWatchlist,
                removeFromWatchlist,
                toggleWatchlist,
                isInWatchlist,
            }}
        >
            {children}
        </WatchlistContext.Provider>
    );
};

export const useWatchlist = () => {
    const context = useContext(WatchlistContext);
    if (!context) {
        throw new Error('useWatchlist must be used within WatchlistProvider');
    }
    return context;
};

export default WatchlistContext;

