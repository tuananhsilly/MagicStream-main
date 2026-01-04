// magic-stream-seed-data/expand-movies.js
const fs = require('fs');
const path = require('path');

// Đọc dữ liệu hiện tại
const moviesPath = path.join(__dirname, 'movies.json');
const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));

// Rankings hợp lệ
const rankings = [
    { ranking_value: 1, ranking_name: "Excellent" },
    { ranking_value: 2, ranking_name: "Good" },
    { ranking_value: 3, ranking_name: "Okay" },
    { ranking_value: 4, ranking_name: "Bad" },
    { ranking_value: 5, ranking_name: "Terrible" }
];

// Suffixes để biến đổi title
const titleSuffixes = [
    " (Part 2)",
    " (Part 3)",
    " (Remastered)",
    " (Extended Edition)",
    " (Director's Cut)",
    " (Special Edition)",
    " (Collector's Edition)",
    " (Ultimate Edition)",
    " (Anniversary Edition)",
    " (Restored)",
    " (4K Remaster)",
    " (Classic Edition)",
    " (Deluxe Edition)",
    " (Premium Edition)",
    " (Limited Edition)",
    " (Theatrical Cut)",
    " (Unrated)",
    " (International Version)",
    " (Complete Edition)",
    " (Final Cut)"
];

// Admin review variations
const reviewVariations = [
    "A classic film that stands the test of time.",
    "An engaging story with memorable characters.",
    "Well-crafted cinematography and direction.",
    "A must-watch for fans of the genre.",
    "Solid performances from the cast.",
    "Entertaining from start to finish.",
    "A thought-provoking narrative.",
    "Beautifully shot and well-paced.",
    "Great storytelling and character development.",
    "An enjoyable viewing experience."
];

// Hàm tạo imdb_id mới (deterministic dựa trên index)
function generateImdbId(baseImdbId, copyIndex) {
    // Extract số từ base imdb_id (ví dụ: "tt0111161" -> 111161)
    const baseNum = parseInt(baseImdbId.replace('tt', ''), 10);
    // Tạo số mới: baseNum + copyIndex * 1000000 (để tránh trùng)
    const newNum = baseNum + (copyIndex * 1000000);
    // Đảm bảo 7 chữ số
    const paddedNum = String(newNum).padStart(7, '0');
    return `tt${paddedNum}`;
}

// Hàm biến đổi ranking (dao động nhẹ)
function varyRanking(originalRanking, copyIndex) {
    const currentValue = originalRanking.ranking_value;
    // Chỉ dao động nếu không phải Not_Ranked (999)
    if (currentValue === 999) {
        return originalRanking;
    }
    
    // Dao động ±1 hoặc ±2 dựa trên copyIndex
    const variation = (copyIndex % 3) - 1; // -1, 0, hoặc 1
    let newValue = currentValue + variation;
    
    // Giới hạn trong khoảng 1-5
    if (newValue < 1) newValue = 1;
    if (newValue > 5) newValue = 5;
    
    return rankings.find(r => r.ranking_value === newValue) || originalRanking;
}

// Hàm rotate genres (thỉnh thoảng thay đổi genre)
function varyGenres(originalGenres, copyIndex) {
    // Giữ nguyên 80% thời gian
    if (copyIndex % 5 !== 0) {
        return originalGenres;
    }
    
    // 20% thời gian: thêm hoặc bớt một genre
    const allGenreIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const genreNames = {
        1: "Comedy", 2: "Drama", 3: "Western", 4: "Fantasy",
        5: "Thriller", 6: "Sci-Fi", 7: "Action", 8: "Mystery", 9: "Crime"
    };
    
    const currentIds = originalGenres.map(g => g.genre_id);
    const availableIds = allGenreIds.filter(id => !currentIds.includes(id));
    
    if (availableIds.length > 0 && copyIndex % 2 === 0) {
        // Thêm một genre mới
        const newId = availableIds[copyIndex % availableIds.length];
        return [...originalGenres, { genre_id: newId, genre_name: genreNames[newId] }];
    } else if (originalGenres.length > 1) {
        // Bớt một genre (giữ lại ít nhất 1)
        return originalGenres.slice(0, -1);
    }
    
    return originalGenres;
}

// Hàm tạo admin review variation
function varyReview(originalReview, copyIndex) {
    // Nếu review rỗng hoặc ngắn, thay bằng variation
    if (!originalReview || originalReview.trim().length < 10) {
        return reviewVariations[copyIndex % reviewVariations.length];
    }
    
    // 30% thời gian thay đổi review
    if (copyIndex % 3 === 0) {
        return reviewVariations[copyIndex % reviewVariations.length];
    }
    
    return originalReview;
}

// Expand movies
const expandedMovies = [];
const targetCount = 250; // Mục tiêu 250 movies
const copiesPerMovie = Math.ceil(targetCount / movies.length);

console.log(`Expanding ${movies.length} movies to ~${targetCount} movies...`);
console.log(`Generating ~${copiesPerMovie} copies per movie...`);

movies.forEach((movie, movieIndex) => {
    // Thêm movie gốc
    expandedMovies.push({ ...movie });
    
    // Tạo copies
    for (let copyIndex = 1; copyIndex < copiesPerMovie && expandedMovies.length < targetCount; copyIndex++) {
        const newMovie = {
            imdb_id: generateImdbId(movie.imdb_id, copyIndex),
            title: movie.title + titleSuffixes[copyIndex % titleSuffixes.length],
            poster_path: movie.poster_path, // Giữ nguyên poster
            youtube_id: movie.youtube_id, // Giữ nguyên youtube_id
            genre: varyGenres(movie.genre, copyIndex),
            admin_review: varyReview(movie.admin_review, copyIndex),
            ranking: varyRanking(movie.ranking, copyIndex)
        };
        
        expandedMovies.push(newMovie);
    }
});

// Đảm bảo đủ số lượng
while (expandedMovies.length < targetCount) {
    const sourceIndex = expandedMovies.length % movies.length;
    const sourceMovie = movies[sourceIndex];
    const copyIndex = Math.floor(expandedMovies.length / movies.length);
    
    expandedMovies.push({
        imdb_id: generateImdbId(sourceMovie.imdb_id, copyIndex + 10),
        title: sourceMovie.title + titleSuffixes[(copyIndex + 10) % titleSuffixes.length],
        poster_path: sourceMovie.poster_path,
        youtube_id: sourceMovie.youtube_id,
        genre: varyGenres(sourceMovie.genre, copyIndex + 10),
        admin_review: varyReview(sourceMovie.admin_review, copyIndex + 10),
        ranking: varyRanking(sourceMovie.ranking, copyIndex + 10)
    });
}

// Giới hạn chính xác số lượng
const finalMovies = expandedMovies.slice(0, targetCount);

// Cleanup: trim ranking_name (fix lỗi có newline)
finalMovies.forEach(movie => {
    if (movie.ranking && movie.ranking.ranking_name) {
        movie.ranking.ranking_name = movie.ranking.ranking_name.trim();
    }
});

// Ghi file mới
const outputPath = path.join(__dirname, 'movies-expanded.json');
fs.writeFileSync(outputPath, JSON.stringify(finalMovies, null, 4), 'utf8');

console.log(`\n✅ Successfully generated ${finalMovies.length} movies!`);
console.log(`📁 Output file: ${outputPath}`);
console.log(`\n📊 Statistics:`);
console.log(`   - Original movies: ${movies.length}`);
console.log(`   - Expanded movies: ${finalMovies.length}`);
console.log(`   - Copies generated: ${finalMovies.length - movies.length}`);

// Hiển thị 3 ví dụ
console.log(`\n📝 Example records (first 3 duplicates):`);
finalMovies.slice(movies.length, movies.length + 3).forEach((movie, idx) => {
    console.log(`\n   ${idx + 1}. ${movie.title}`);
    console.log(`      imdb_id: ${movie.imdb_id}`);
    console.log(`      ranking: ${movie.ranking.ranking_name} (${movie.ranking.ranking_value})`);
    console.log(`      genres: ${movie.genre.map(g => g.genre_name).join(', ')}`);
});