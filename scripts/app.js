$(document).on("pagecreate", "#home", function() {
    setTimeout(function() {populateTopMovies()}, 350);
});
$(document).on("pagebeforecreate", function(event) {
    preload();
});
$(document).on("pagecreate", "#search", function() {
    $("#searchbar").keyup(function(data) {
        if ($("#searchbar").val() && $("#searchbar").val().length > 2) {
            search();
        }
    });
});
$(document).on("pagecreate", "#watchlist", function() {
    setTimeout(function() {populateWatchlist()}, 350);
});

var baseDBurl = "https://api.themoviedb.org/3";
var apikey = "6556ddaf81dee51a0af2b6e45a6d4a2d";
var config = null;
var watchlist = [];

function preload() {
    getConfiguration();
    if (typeof(localStorage) !== "undefined") {
        if (localStorage["watchlist"] === undefined) {
            localStorage["watchlist"] = JSON.stringify([]);
        }
        watchlist = JSON.parse(localStorage["watchlist"]);
    }
}

function getSortedWatchlist() {
    var displayArray = watchlist.slice();
    var sortingValue = $("#watchlistSortOption").val();
    var sortingOrder = $("#watchlistSortOrder");
    var compareFunction = null;
    switch (sortingValue) {
        case "release":
            compareFunction = function(a, b) {
                return new Date(a.release_date) < new Date(b.release_date);
            }
            break;
        case "rating":
            compareFunction = function(a, b) {
                return a.vote_average < b.vote_average;
            }
            break;
        case "name":
            compareFunction = function(a, b) {
                return a.title < b.title;
            }
            break;
    }
    if (compareFunction !== null) {
        displayArray.sort(compareFunction);
    }
    if (sortingOrder.is(":checked")) {
        displayArray.reverse();
    }
    return displayArray;
}

function populateWatchlist() {
    if (config === null) {
        getConfiguration();
    }
    $("#watchlistmovies").hide().fadeIn("500");
    $("#watchlistmovies").html(createList(getSortedWatchlist()));
    $("#watchlistmovies").listview().listview("refresh");
}

function getWatchlistButton(movieIndex, inWatchlist) {
    var icon = inWatchlist ? "minus" : "plus";
    var text = inWatchlist ? "Remove from watchlist" : "Add to watchlist";
    return "<button id='watchlistButton' class='ui-btn ui-icon-" + icon + " ui-btn-icon-left' onclick='toggleWatchlistButton(" + movieIndex + ")'>" + text + "</button>";
}

function toggleWatchlistButton(movieIndex) {
    var inWatchlist = isInWatchlist(movieIndex);
    var button = "";
    if (inWatchlist) {
        removeMovieDataFromLocalStorage(movieIndex);
        button = getWatchlistButton(movieIndex, false);
    } else {
        saveMovieDataToLocalStorage(movieIndex);
        button = getWatchlistButton(movieIndex, true);
    }
    $("#moviedetailsfooter").html(button).enhanceWithin();
}

function saveMovieDataToLocalStorage(movieIndex) {
    var url = baseDBurl + "/movie/" + movieIndex + "?api_key=" + apikey + "&append_to_response=credits,videos";
    $.get(url, function(data) {
        watchlist.push(data);
        if (typeof(localStorage) !== "undefined") {
            localStorage["watchlist"] = JSON.stringify(watchlist);
        }
    }).fail(function() {
        $("#moviedetailsfooter").html(getWatchlistButton(movieIndex, false)).enhanceWithin();
    });
}

function removeMovieDataFromLocalStorage(movieIndex) {
    var tempList = [];
    for (var idx=0; idx < watchlist.length; idx++) {
        if (watchlist[idx].id !== movieIndex) {
            tempList.push(watchlist[idx]);
        }
    }
    watchlist = tempList;
    if (typeof(localStorage) !== "undefined") {
        localStorage["watchlist"] = JSON.stringify(watchlist);
    }
}

function getImageSource(data, size) {
    if (config === null) {
        return "images/noimages.png";
    }
    var poster = config.images.base_url + config.images.poster_sizes[size] + data.poster_path;
    if (data.poster_path === null) {
        poster = config.images.base_url + config.images.backdrop_sizes[size] + data.backdrop_path;
    }
    if (data.poster_path === null && data.backdrop_path === null) {
        poster = "images/noimages.png";
    }
    return poster;
}

function getTitle(data) {
    return data.title + (data.title === data.original_title ? "" : " (" + data.original_title + ")");
}

function getGenres(data) {
    var genres = "";
    for (var idx = 0; idx < data.genres.length; idx++) {
        genres += "<li>" + data.genres[idx].name + "</li>";
    }
    return genres;
}

function getCrew(data) {
    var crew = "<ul data-role='listview'>";
    for (var idx = 0; idx < data.credits.crew.length; idx++) {
        crew += "<li>" + data.credits.crew[idx].job + " " + data.credits.crew[idx].name + "</li>";
    }
    return crew + "</ul>";
}

function getCast(data) {
    var cast = "<ul data-role='listview'>";
    for (var idx = 0; idx < data.credits.cast.length; idx++) {
        cast += "<li>" + data.credits.cast[idx].name + " as " + data.credits.cast[idx].character + "</li>";
    }
    return cast + "</ul>";
}

function getYoutubeVideos(data) {
    var videos = "<ul data-role='listview'>";
    var results = data.videos.results;
    for (var idx = 0; idx < results.length; idx++) {
        var video = results[idx];
        if (video.site === "YouTube") {
            var key = video.key;
            videos += "<li><a href='#" + key + "' data-rel='popup' onclick='updateVideoPlayerSize(\"" + key + "\")'>" + video.name + "</a></li>";
        }
    }
    return videos + "</ul>";
}

function getPopupForVideos(videos) {
    var youtube = "https://www.youtube.com/embed/";
    var embeddedVideoPopup = "";
    var videoWidth = $(window).width() * 0.8;
    for (idx in videos) {
        embeddedVideoPopup += "<div class='videoPopup' data-role='popup' data-position-to='window' data-overlay-theme='b' id='" + videos[idx].key + "'>" + 
            "<iframe class='video' width='" + videoWidth + "' height='" + (videoWidth / 1.777777) + "' src='" + youtube + videos[idx].key + "' frameborder='0' allowfullscreen></iframe>" + 
            "</div>";
    }
    return embeddedVideoPopup;
}

function updateVideoPlayerSize(id) {
    var videoWidth = $(window).width() * 0.8;
    $("#" + id + " .video").width(videoWidth).height(videoWidth / 1.777777);
}

function stopVideoWhenPopupCloses(id) {
    var video = $("#" + id + " .video");
    video.attr("src", video.attr("src"));
}

function populateDetails(index) {
    var url = baseDBurl + "/movie/" + index + "?api_key=" + apikey + "&append_to_response=credits,videos";
    $.get(url, function(data) {
        if (config === null) {
            getConfiguration();
        }
        putDetailsToPage(data, index);
    }).fail(function() {
        for (idx in watchlist) {
            if (watchlist[idx].id === index) {
                putDetailsToPage(watchlist[idx], index);
                return;
            }
        }
        $("#moviedetails").html("<h1>Data unavailable</h1>");
    });
}

function putDetailsToPage(data, index) {
    var embeddedVideos = getPopupForVideos(data.videos.results);
    var content = 
        "<div>" +
            "<h1>" + getTitle(data) + "</h1>" + 
            "<p>Released: " + data.release_date + "</p>" +
        "</div>" +
        "<a href='#detailspanel' class='ui-btn'>Details</a>" +            
        "<div class='ui-grid-a ui-responsive grid-image-size'>" +
            "<img src='" + getImageSource(data, 3) + "' class='ui-block-a'>" +
            "<div class='ui-block-b'>" + 
                "<h3 class='ui-bar ui-bar-a'>Description</h3>" +
                "<p>" + data.overview + "</p>" +
            "</div>" +
        "</div>" +
        "<div data-role='collapsible'>" +
            "<h1>Videos</h1>" +
            getYoutubeVideos(data) +
        "</div>" +
        "<div data-role='collapsible'>" + 
            "<h1>Crew</h1>" +
            getCrew(data) + 
        "</div>" +
        "<div data-role='collapsible'>" +
            "<h1>Cast</h1>" +
            getCast(data) + 
        "</div>" + 
        embeddedVideos;
    $("#moviedetails").html(content);
    var panel = 
        "<h2 class='ui-bar ui-bar-a'>Details</h2>" + 
        "<ul data-role='listview'>" +
            "<li data-role='list-divider'>Runtime</li>" +
            "<li>" + data.runtime + " minutes</li>" +
            (data.homepage === "" ? "" : "<li data-role='list-divider'>Homepage</li><li><a href='" + data.homepage + "'>" + data.homepage + "</a></li>") +
            "<li data-role='list-divider'>Genres</li>" +
            getGenres(data) +
        "</ul>";
    $("#detailspanel").html(panel);
    var inWatchlist = isInWatchlist(index);
    var button = getWatchlistButton(index, inWatchlist);
    $("#moviedetailsfooter").html(button);
    $("#details").enhanceWithin();
    $(".videoPopup").each(function() {
        $(this).on("popupafterclose", function(e) {
            stopVideoWhenPopupCloses($(e.target).attr("id"));
        });
    });
}

function isInWatchlist(index) {
    for (var idx=0; idx < watchlist.length; idx++) {
        if (watchlist[idx].id === index) {
            return true;
        }
    }
    return false;
}

function populateTopMovies() {
    var url = baseDBurl + "/movie/top_rated?api_key=" + apikey;    
    $("#topmovies").hide();    
    $.get(url, function(data) {
        if (config === null) {
            getConfiguration();
        }
        $("#topmovies").html(createList(data.results)).fadeIn("500");
        $("#topmovies").listview().listview("refresh");
    }).fail(function() {
        $("#topmovies").html("<h1>Refresh failed!</h1><h3>Make sure you are connected to the Internet and try again!</h3>").fadeIn("250");
    });
}

function getConfiguration() {
    var configUrl = baseDBurl + "/configuration?api_key=" + apikey;
    $.ajax({url: configUrl, success: function(data) {
        config = data;
    }, cache: false});
}

function search() {
    var query = $("#searchbar").val();
    var url = baseDBurl + "/search/movie?api_key=" + apikey + "&query=" + query;
    $.get(url, function(data) {
        var results = data.results;
        if (results.length === 0) {
            $("#searchresults").html("<h1>No results found for query: " + query + "</h1>");
        } else {
            $("#searchresults").html(createList(results));
            $("#searchresults").listview().listview("refresh");
        }
    }).fail(function() {
        $("#searchresults").html("<h1>Failed to load search results!</h1><h3>Make sure you are connected to the Internet and try again!</h3>");
    });
}

function createList(data) {
    var list = "";
    for (idx in data) {
        list += "<li><a href='#details' onclick='populateDetails(" + data[idx].id + ")'>" + createListItem(data[idx]) + "</a></li>";
    }
    return list;
}

function createListItem(data) {
    var poster = "<img src='" + getImageSource(data, 0) + "'>";
    var title = "<h2>" + getTitle(data) + "</h2>";
    var releaseDate = "<p>Release date: " + data.release_date + "</p>";
    return poster + title + releaseDate;
}
