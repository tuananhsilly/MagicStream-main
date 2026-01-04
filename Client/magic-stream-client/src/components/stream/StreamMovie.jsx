import { useParams } from 'react-router-dom';
import ReactPlayer from 'react-player';
import './StreamMovie.css';

const StreamMovie = () => {
    const params = useParams();
    const key = params.yt_id;

    return (
        <div className="stream-container">
            <div className="player-wrapper">
                {key ? (
                    <ReactPlayer
                        url={`https://www.youtube.com/watch?v=${key}`}
                        controls
                        playing
                        width="100%"
                        height="100%"
                        className="react-player"
                        config={{
                            youtube: {
                                playerVars: { modestbranding: 1 }
                            }
                        }}
                    />
                ) : (
                    <div className="error-state">
                        <p>No video available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StreamMovie;